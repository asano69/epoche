import {
  createSignal,
  createEffect,
  on,
  onMount,
  onCleanup,
  For,
  Show,
} from "solid-js";
import { A } from "@solidjs/router";
import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";
import { createEditor, union } from "prosekit/core";
import { defineBasicExtension } from "prosekit/basic";
import { defineReadonly } from "prosekit/extensions/readonly";

import pb from "../../lib/pb";
import { formatDisplayDate } from "../../lib/date";
import { notePath } from "../../lib/notePath";
import Loading from "../Loading";

const PAGE_SIZE = 20;

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
// the editable ProseKit editor in routes/contexts/Editor.jsx, so a note
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

  // pt-0 overrides notes-editor-content's default p-3 padding-top so
  // this preview's text starts flush with the row's own top padding,
  // lining up with the date column beside it. pb-6 widens the gap
  // below the text instead, since the row's own py-4 alone reads as
  // too tight underneath multi-line content.
  return (
    <div
      ref={mountEditor}
      class="ProseMirror notes-editor-content pt-0 pb-6"
    />
  );
}

// Paginated list of notes, newest first, loaded page by page as the
// user scrolls (see the IntersectionObserver below). Shared by the
// per-context notes list (routes/contexts/Notes.jsx) and the global
// "all notes" list (routes/Home.jsx), so both stay visually and
// behaviorally identical.
//
// Props:
//   filter: optional PocketBase filter string restricting which notes
//     are listed (e.g. "context.context = '...'"). Omit to list every
//     note across every context.
export default function NotesList(props) {
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
        filter: props.filter,
        sort: "-date",
        // Always expanded (not just when showContext is set), since
        // it's also needed to build each note's link (see notePath
        // below), regardless of whether the badge itself is shown.
        expand: "context",
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

  // Re-fetches from page 1 whenever the filter changes (e.g. the parent
  // page switches contexts). Solid Router reuses the same component
  // instance across routes matched by the same pattern, so relying on
  // onMount alone would only ever load whichever filter was active on
  // first render. on(() => props.filter, ...) scopes the effect to
  // that one dependency, so signals read inside loadPage (loading,
  // page, ...) don't also end up retriggering it.
  createEffect(
    on(
      () => props.filter,
      () => {
        setNotes([]);
        setPage(0);
        setHasMore(true);
        setError("");
        loadPage(1);
      },
    ),
  );

  onCleanup(() => observer?.disconnect());

  return (
    <>
      <Show when={error()}>
        <p class="text-sm text-[#dc3545]">{error()}</p>
      </Show>

      {/* One note per row, full width, in a single-column list rather
          than a grid, so the full (potentially multi-paragraph) content
          reads naturally without being cramped into a card. */}
      <div class="flex flex-col [&>*]:border-b [&>*]:border-border [&>*:last-child]:border-b-0">
        <For each={notes()}>
          {(note) => (
            <A
              href={notePath(note.expand.context.context, note.date)}
              class="flex flex-col-reverse gap-1 py-4 pr-2 transition-colors hover:bg-hover-bg sm:flex-row sm:items-start sm:gap-2"
            >
              {/* Content column takes the remaining space; date column
                  is a fixed width on the right so dates line up across
                  rows regardless of content length. On mobile
                  (flex-col-reverse), the date renders above the content
                  instead, since there isn't room for a side-by-side
                  layout. */}
              <div class="min-w-0 flex-1">
                <NoteContent note={note} />
              </div>
              <span class="w-28 shrink-0 whitespace-nowrap text-right text-md font-mono sm:shrink-0 sm:whitespace-nowrap sm:text-md">
                {formatDisplayDate(note.date)}
              </span>
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
    </>
  );
}
