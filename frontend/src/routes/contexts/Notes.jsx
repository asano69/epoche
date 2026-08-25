import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { useParams, A } from "@solidjs/router";
import SquarePen from "lucide-solid/icons/square-pen";
import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";
import { createEditor, union } from "prosekit/core";
import { defineBasicExtension } from "prosekit/basic";
import { defineReadonly } from "prosekit/extensions/readonly";

import pb from "../../lib/pb";
import { formatDisplayDate } from "../../lib/date";
import Loading from "../../components/Loading";

const PAGE_SIZE = 20;

// Builds the "/context/:contextName/:year/:month/:day" path for a note,
// splitting its "date" field (stored as "YYYY-MM-DD") into segments.
function notePath(contextName, date) {
  const [year, month, day] = date.split("-");
  return `/context/${encodeURIComponent(contextName)}/${year}/${month}/${day}`;
}

// Today's date as "YYYY-MM-DD". Each context can only have one note per
// day, so the "New note" button always points at today's note, whether
// it already exists or not.
function todayDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// ProseMirror schemas require a doc to contain at least one block node,
// so an empty/null "note" field (e.g. a note that was created but never
// written to) would fail schema validation if handed to createEditor
// directly. This checks for that case up front so NoteEditorView (and
// its createEditor call) is only ever mounted with valid content.
function hasContent(doc) {
  return Boolean(doc && Array.isArray(doc.content) && doc.content.length > 0);
}

// Renders a single note's ProseMirror JSON document as read-only,
// reusing the exact same schema/extensions and CSS (typography.css) as
// the editable ProseKit editor in routes/notes/Editor.jsx, so a note
// looks identical here and there.
function NoteContent(props) {
  return (
    <Show
      when={hasContent(props.note.note)}
      fallback={<p class="text-sm italic text-border">(empty note)</p>}
    >
      <NoteEditorView note={props.note} />
    </Show>
  );
}

function NoteEditorView(props) {
  const editor = createEditor({
    extension: union(defineBasicExtension(), defineReadonly()),
    defaultContent: props.note.note,
  });

  const mountEditor = (el) => {
    const unmount = editor.mount(el);
    onCleanup(() => unmount?.());
  };

  return <div ref={mountEditor} class="ProseMirror notes-editor-content" />;
}

// Notes list for a single context, newest first, loaded page by page as
// the user scrolls (see the IntersectionObserver below).
export default function ContextNotes() {
  const params = useParams();
  // Context names come from the URL, so they may be percent-encoded.
  const contextName = () => decodeURIComponent(params.contextName);

  const [notes, setNotes] = createSignal([]);
  const [page, setPage] = createSignal(0);
  const [hasMore, setHasMore] = createSignal(true);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  // Set by the sentinel div's `ref` below; observed once mounted.
  let sentinel;
  let observer;

  const loadPage = async (pageNum) => {
    if (loading()) return;
    setLoading(true);
    setError("");
    try {
      const result = await pb.collection("notes").getList(pageNum, PAGE_SIZE, {
        // Filters by the related context's name rather than its id, since
        // that's what the URL carries. pb.filter() escapes the value
        // safely instead of interpolating it into the query string.
        filter: pb.filter("context.context = {:name}", {
          name: contextName(),
        }),
        sort: "-date",
      });
      setNotes((prev) =>
        pageNum === 1 ? result.items : [...prev, ...result.items],
      );
      setHasMore(pageNum < result.totalPages);
      setPage(pageNum);
    } catch (err) {
      // Log name/message and stack as separate console.error args.
      // Firefox's Error#stack omits the message entirely (just lists
      // call frames), so relying on `err.stack` alone can hide the one
      // piece of information (the actual assertion text) needed to
      // diagnose the failure.
      console.error(
        "[notes] failed to load:",
        `${err?.name}: ${err?.message}`,
        err?.stack,
      );
      setError(err?.data?.message || err?.message || "Failed to load notes.");
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadPage(1);

    // Loads the next page once the sentinel element at the bottom of the
    // list scrolls into view. IntersectionObserver's default root (the
    // viewport) still respects clipping from MainLayout's scrollable
    // <main>, so this works without pointing root at that container
    // explicitly.
    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore() && !loading()) {
        loadPage(page() + 1);
      }
    });
    if (sentinel) observer.observe(sentinel);
  });

  onCleanup(() => observer?.disconnect());

  return (
    <div class="flex flex-col gap-4">
      <h1 class="font-sans text-4xl">{contextName()}</h1>

      {/* New note button, pre-fills the combobox on the editor page via
          the "context" query param (see Editor.jsx). */}
      <div class="flex justify-end">
        <A
          href={notePath(contextName(), todayDate())}
          aria-label="New note"
          class="rounded-md p-1 transition-colors hover:bg-hover-bg"
        >
          <SquarePen size={30} />
        </A>
      </div>

      <Show when={error()}>
        <p class="text-sm text-[#dc3545]">{error()}</p>
      </Show>

      {/* One note per row, full width, in a single-column list rather
          than a grid, so the full (potentially multi-paragraph) content
          reads naturally without being cramped into a card. */}
      <div class="flex flex-col divide-y divide-border">
        <For each={notes()}>
          {(note) => (
            <A
              href={notePath(contextName(), note.date)}
              class="flex flex-col gap-2 py-4 transition-colors hover:bg-hover-bg"
            >
              <span class="text-2xl font-display text-right mr-5">
                {formatDisplayDate(note.date)}
              </span>
              <NoteContent note={note} />
            </A>
          )}
        </For>
      </div>

      <Show when={!loading() && notes().length === 0}>
        <p class="text-sm text-border">No notes yet.</p>
      </Show>

      <Show when={loading()}>
        <Loading />
      </Show>

      {/* Observed by IntersectionObserver to trigger the next page load. */}
      <div ref={sentinel} class="h-1" />
    </div>
  );
}
