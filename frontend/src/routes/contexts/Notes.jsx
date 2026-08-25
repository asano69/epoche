import {
  createSignal,
  createEffect,
  on,
  onMount,
  onCleanup,
  For,
  Show,
} from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import Plus from "lucide-solid/icons/plus";
import Ellipsis from "lucide-solid/icons/ellipsis";
import Pencil from "lucide-solid/icons/pencil";
import Trash2 from "lucide-solid/icons/trash-2";
import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";
import { createEditor, union } from "prosekit/core";
import { defineBasicExtension } from "prosekit/basic";
import { defineReadonly } from "prosekit/extensions/readonly";

import pb from "../../lib/pb";
import {
  contextByName,
  contextsLoaded,
  renameContext,
  deleteContext,
} from "../../lib/contexts";
import { formatDisplayDate } from "../../lib/date";
import Loading from "../../components/Loading";
import PromptDialog from "../../components/dialogs/PromptDialog";
import ConfirmDialog from "../../components/dialogs/ConfirmDialog";

const PAGE_SIZE = 20;

// Builds the "/contexts/:contextName/:year/:month/:day" path for a
// note, splitting its "date" field (stored as "YYYY-MM-DD") into
// segments.
function notePath(contextName, date) {
  const [year, month, day] = date.split("-");
  return `/contexts/${encodeURIComponent(contextName)}/${year}/${month}/${day}`;
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

  // "note-preview" strips the editor's fixed min-height (see
  // components.css) so each preview's height matches its own content
  // instead of being padded out to the editor's size.
  return (
    <div
      ref={mountEditor}
      class="ProseMirror notes-editor-content note-preview"
    />
  );
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

  const navigate = useNavigate();
  // Backing "contexts" record for this page, used by the edit/delete
  // menu below for its id and current name. Derived from the shared
  // store (see lib/contexts.js) instead of a separate fetch, so it
  // reflects create/rename/delete done anywhere else in the app.
  const context = () => contextByName(contextName());
  const [editOpen, setEditOpen] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);

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

  // Re-fetches from page 1 whenever contextName changes. Solid Router
  // reuses this same component instance when navigating between two
  // paths matched by the same route (e.g. picking a different context
  // from the sidebar), so onMount alone would only ever load whichever
  // context was active on first render. on(contextName, ...) scopes the
  // effect to that single dependency, so signals read inside loadPage
  // (loading, page, ...) don't also end up retriggering it.
  createEffect(
    on(contextName, () => {
      setNotes([]);
      setPage(0);
      setHasMore(true);
      setError("");
      loadPage(1);
    }),
  );

  onCleanup(() => observer?.disconnect());

  // Renames the context, then navigates to its new URL so the address
  // bar and the notes list (which re-fetches on contextName changes,
  // see the effect above) both follow the new name.
  const handleRename = async (newName) => {
    await renameContext(context().id, newName);
    navigate(`/contexts/${encodeURIComponent(newName)}`);
  };

  const handleDelete = async () => {
    // Notes belonging to this context cascade-delete on the server
    // (see the "context" relation field's cascadeDelete in the
    // collections migration), so there's nothing else to clean up here.
    await deleteContext(context().id);
    navigate("/");
  };

  return (
    // On wide screens (xl and up, 1280px+) cap the content at a readable
    // width and reserve a margin beside it for a future
    // timeline/minimap/scrollbar. Below xl there isn't room for that
    // margin, so notes keep using the full width like before.
    <div class="flex xl:justify-center xl:gap-8">
      <div class="flex w-full flex-col gap-4 xl:max-w-3xl">
        <div class="flex items-center gap-4">
          <h1 class="font-sans text-4xl">{contextName()}</h1>

          {/* Rename/delete menu for this context, styled like TopBar's
              UserMenu. Hidden until the context record has loaded, since
              both actions need its id. Placed right next to the title
              (not pushed to the far right) via gap-2 above instead of
              justify-between. */}
          <Show when={context()}>
            <DropdownMenu>
              <DropdownMenu.Trigger
                aria-label="Context actions"
                class="icon-btn"
              >
                <Ellipsis size={24} />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content class="z-50 min-w-[160px] rounded-md border border-border bg-card p-1 shadow-popover outline-none font-sans">
                  <DropdownMenu.Item
                    onSelect={() => setEditOpen(true)}
                    class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text outline-none transition-colors hover:bg-hover-bg data-[highlighted]:bg-hover-bg"
                  >
                    <Pencil size={16} />
                    Edit
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onSelect={() => setDeleteOpen(true)}
                    class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-[#dc3545] outline-none transition-colors hover:bg-hover-bg data-[highlighted]:bg-hover-bg"
                  >
                    <Trash2 size={16} />
                    Delete
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu>
          </Show>
        </div>

        <Show when={error()}>
          <p class="text-sm text-[#dc3545]">{error()}</p>
        </Show>

        {/* One note per row, full width, in a single-column list rather
            than a grid, so the full (potentially multi-paragraph) content
            reads naturally without being cramped into a card. */}
        {/* border-t adds a line above the first card too; divide-y still
            handles the lines between the rest. */}
        {/* "New note" is the first row in the list, styled and sized
            like the note rows below it so its full width acts as the
            click target instead of a small standalone icon button. */}
        <div class="flex flex-col divide-y divide-border border-t border-border">
          <A
            href={notePath(contextName(), todayDate())}
            aria-label="New note"
            class="flex items-center gap-2 py-4 pr-2 transition-colors hover:bg-hover-bg"
          >
            <Plus size={20} />
            <span class="font-sans text-md">New note</span>
          </A>
          <For each={notes()}>
            {(note) => (
              <A
                href={notePath(contextName(), note.date)}
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
                <span class="w-28 shrink-0 whitespace-nowrap text-right text-md font-serif sm:shrink-0 sm:whitespace-nowrap sm:text-md">
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

        <Show when={context()}>
          <PromptDialog
            open={editOpen()}
            onOpenChange={setEditOpen}
            title="Rename context"
            label="Name"
            initialValue={context().context}
            errorMessage="Failed to rename the context."
            onSubmit={handleRename}
          />
          <ConfirmDialog
            open={deleteOpen()}
            onOpenChange={setDeleteOpen}
            title="Delete context?"
            description={`This permanently deletes "${contextName()}" and all of its notes.`}
            confirmLabel="Delete"
            submittingLabel="Deleting…"
            errorMessage="Failed to delete the context."
            onConfirm={handleDelete}
          />
        </Show>
      </div>

      {/* Reserved margin for a future timeline/minimap/scrollbar, shown
          only when there's room (see the xl breakpoint above). For now
          this is purely decorative: one line per currently-loaded note,
          no interaction yet. */}
      <div class="hidden w-16 shrink-0 xl:block">
        <div class="flex flex-col items-center gap-1.5 pt-2">
          <For each={notes()}>{() => <div class="h-px w-8 bg-border" />}</For>
        </div>
      </div>
    </div>
  );
}
