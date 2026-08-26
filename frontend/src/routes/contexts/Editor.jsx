import { createSignal, onCleanup, Show, createResource, For } from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import { contextByName, contexts, contextsLoaded } from "../../lib/contexts";
import ArrowLeft from "lucide-solid/icons/arrow-left";
import ArrowRightLeft from "lucide-solid/icons/arrow-right-left";
import Trash2 from "lucide-solid/icons/trash-2";
import Save from "lucide-solid/icons/save";
import Check from "lucide-solid/icons/check";
import Undo2 from "lucide-solid/icons/undo-2";
import Redo2 from "lucide-solid/icons/redo-2";
import Bold from "lucide-solid/icons/bold";
import Italic from "lucide-solid/icons/italic";
import UnderlineIcon from "lucide-solid/icons/underline";
import Strikethrough from "lucide-solid/icons/strikethrough";
import CodeIcon from "lucide-solid/icons/code";
import Heading2 from "lucide-solid/icons/heading-2";
import Quote from "lucide-solid/icons/quote";
import List from "lucide-solid/icons/list";
import ListOrdered from "lucide-solid/icons/list-ordered";
import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";
import { defineBasicExtension } from "prosekit/basic";
import { createEditor } from "prosekit/core";
import { ProseKit, useEditorDerivedValue } from "prosekit/solid";

import pb from "../../lib/pb";
// NOTE: `Button` from "@kobalte/core/button" import removed below since
// the save action is now a plain <button class="icon-btn"> in the
// header row instead of a full-width kobalte Button.
import { formatDisplayDate } from "../../lib/date";
import { notePath } from "../../lib/notePath";
import Loading from "../../components/Loading";
import ActionsMenu from "../../components/menus/ActionsMenu";
import ComboboxDialog from "../../components/dialogs/ComboboxDialog";
import ConfirmDialog from "../../components/dialogs/ConfirmDialog";

// A note is looked up by its context and date rather than by id (see
// lib/router.jsx), so this page resolves both from the URL before
// rendering the form: first the context record (by name), then any
// existing note for that context/date pair.
export default function Editor() {
  const params = useParams();
  const date = () =>
    `${params.year}-${params.month.padStart(2, "0")}-${params.day.padStart(2, "0")}`;

  // Derived from the shared contexts store (see lib/contexts.js)
  // instead of a separate fetch, so it stays in sync with
  // create/rename/delete done anywhere else in the app.
  const context = () => contextByName(params.contextName);
  const [note] = createResource(
    () => (context() ? [context().id, date()] : undefined),
    fetchNote,
  );

  return (
    <Show when={contextsLoaded()} fallback={<Loading />}>
      <Show
        when={context()}
        fallback={
          <p class="text-sm text-[#dc3545]">
            Unknown context: {params.contextName}
          </p>
        }
      >
        <Show when={!note.loading} fallback={<Loading />}>
          <NoteForm
            contextId={context().id}
            contextName={context().context}
            date={date()}
            noteId={note()?.id}
            initialContent={note()?.note}
          />
        </Show>
      </Show>
    </Show>
  );
}

async function fetchNote([contextId, date]) {
  try {
    return await pb
      .collection("notes")
      .getFirstListItem(
        pb.filter("context = {:contextId} && date = {:date}", {
          contextId,
          date,
        }),
      );
  } catch {
    // No note for this context/date yet; Editor starts a blank one.
    return null;
  }
}

// Toolbar buttons, grouped by function (history / marks / block type /
// lists) and each backed by a ProseKit command. Kept as plain data so
// adding, removing, or reordering a formatting option is a one-line
// change instead of touching the render logic below.
const TOOLBAR_GROUPS = [
  [
    { key: "undo", label: "Undo", icon: Undo2 },
    { key: "redo", label: "Redo", icon: Redo2 },
  ],
  [
    { key: "bold", label: "Bold", icon: Bold },
    { key: "italic", label: "Italic", icon: Italic },
    { key: "underline", label: "Underline", icon: UnderlineIcon },
    { key: "strike", label: "Strikethrough", icon: Strikethrough },
    { key: "code", label: "Inline code", icon: CodeIcon },
  ],
  [
    { key: "heading", label: "Heading", icon: Heading2 },
    { key: "blockquote", label: "Quote", icon: Quote },
  ],
  [
    { key: "bulletList", label: "Bullet list", icon: List },
    { key: "orderedList", label: "Numbered list", icon: ListOrdered },
  ],
];

// Derives { isActive, canExec, command } for every toolbar button from
// the current editor state. Passed to useEditorDerivedValue, which
// re-runs it on every ProseMirror transaction.
function getToolbarItems(editor) {
  return {
    undo: {
      isActive: false,
      canExec: editor.commands.undo.canExec(),
      command: () => editor.commands.undo(),
    },
    redo: {
      isActive: false,
      canExec: editor.commands.redo.canExec(),
      command: () => editor.commands.redo(),
    },
    bold: {
      isActive: editor.marks.bold.isActive(),
      canExec: editor.commands.toggleBold.canExec(),
      command: () => editor.commands.toggleBold(),
    },
    italic: {
      isActive: editor.marks.italic.isActive(),
      canExec: editor.commands.toggleItalic.canExec(),
      command: () => editor.commands.toggleItalic(),
    },
    underline: {
      isActive: editor.marks.underline.isActive(),
      canExec: editor.commands.toggleUnderline.canExec(),
      command: () => editor.commands.toggleUnderline(),
    },
    strike: {
      isActive: editor.marks.strike.isActive(),
      canExec: editor.commands.toggleStrike.canExec(),
      command: () => editor.commands.toggleStrike(),
    },
    code: {
      isActive: editor.marks.code.isActive(),
      canExec: editor.commands.toggleCode.canExec(),
      command: () => editor.commands.toggleCode(),
    },
    heading: {
      isActive: editor.nodes.heading.isActive({ level: 2 }),
      canExec: editor.commands.toggleHeading.canExec({ level: 2 }),
      command: () => editor.commands.toggleHeading({ level: 2 }),
    },
    blockquote: {
      isActive: editor.nodes.blockquote.isActive(),
      canExec: editor.commands.toggleBlockquote.canExec(),
      command: () => editor.commands.toggleBlockquote(),
    },
    bulletList: {
      isActive: editor.nodes.list.isActive({ kind: "bullet" }),
      canExec: editor.commands.toggleList.canExec({ kind: "bullet" }),
      command: () => editor.commands.toggleList({ kind: "bullet" }),
    },
    orderedList: {
      isActive: editor.nodes.list.isActive({ kind: "ordered" }),
      canExec: editor.commands.toggleList.canExec({ kind: "ordered" }),
      command: () => editor.commands.toggleList({ kind: "ordered" }),
    },
  };
}

// Must render inside <ProseKit editor={...}>, since useEditorDerivedValue
// reads the current editor from that context.
function Toolbar() {
  const items = useEditorDerivedValue(getToolbarItems);

  return (
    <div class="notes-toolbar">
      <For each={TOOLBAR_GROUPS}>
        {(group, groupIndex) => (
          <>
            {/* No divider before the first group. */}
            <Show when={groupIndex() > 0}>
              <div class="notes-toolbar-divider" />
            </Show>
            <div class="notes-toolbar-group">
              <For each={group}>
                {({ key, label, icon: Icon }) => (
                  <Show when={items()[key]}>
                    {(item) => (
                      <button
                        type="button"
                        title={label}
                        aria-label={label}
                        disabled={!item().canExec}
                        onClick={item().command}
                        classList={{ "is-active": item().isActive }}
                      >
                        <Icon size={17} />
                      </button>
                    )}
                  </Show>
                )}
              </For>
            </div>
          </>
        )}
      </For>
    </div>
  );
}

// Split out from Editor so a fresh ProseKit editor is created every time
// the form is (re)inserted, e.g. once an existing note's data has
// finished loading.
function NoteForm(props) {
  const navigate = useNavigate();

  // Tracks the note's id locally: unset until the first save, at which
  // point it switches from create to update for any further save on
  // this same context/date without needing a page reload.
  const [noteId, setNoteId] = createSignal(props.noteId);
  const [saving, setSaving] = createSignal(false);
  // Briefly true right after a successful save, to swap the save icon
  // for a checkmark; reverted by the timeout scheduled in handleSave.
  const [justSaved, setJustSaved] = createSignal(false);
  const [error, setError] = createSignal("");
  const [moveOpen, setMoveOpen] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  let savedTimeout;
  onCleanup(() => clearTimeout(savedTimeout));

  // Every context except the one this note is currently in, i.e. the
  // valid destinations for "Move context".
  const moveTargets = () => contexts().filter((c) => c.id !== props.contextId);

  const editor = createEditor({
    extension: defineBasicExtension(),
    defaultContent: props.initialContent,
  });

  // Solid doesn't auto-unmount ref callbacks the way React's new
  // ref-cleanup convention does, so the returned unmount function is
  // wired to onCleanup explicitly here.
  const mountEditor = (el) => {
    const unmount = editor.mount(el);
    onCleanup(() => unmount?.());
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = {
        note: editor.getDocJSON(),
        context: props.contextId,
        date: props.date,
      };
      if (noteId()) {
        await pb.collection("notes").update(noteId(), data);
      } else {
        const record = await pb.collection("notes").create(data);
        setNoteId(record.id);
      }
      // Show a checkmark in place of the save icon for a moment to
      // confirm the save succeeded, then revert back to the save icon.
      setJustSaved(true);
      clearTimeout(savedTimeout);
      savedTimeout = setTimeout(() => setJustSaved(false), 1500);
    } catch {
      setError("Failed to save the note.");
    } finally {
      setSaving(false);
    }
  };

  // Re-points this note at a different context, then follows it to the
  // note's new URL (same date, new context name).
  const handleMoveContext = async (target) => {
    await pb.collection("notes").update(noteId(), { context: target.id });
    navigate(notePath(target.context, props.date));
  };

  const handleDeleteNote = async () => {
    await pb.collection("notes").delete(noteId());
    navigate(`/contexts/${encodeURIComponent(props.contextName)}`);
  };

  return (
    // min-h-0 lets this shrink to MainLayout's available height instead
    // of growing to fit content, so the editor pane below can flex-1
    // and scroll internally rather than the whole page scrolling.
    <form onSubmit={handleSave} class="flex h-full min-h-0 w-full flex-col gap-4">
      <div class="flex items-center gap-3">
        {/* Back to this context's notes list. */}
        <A
          href={`/contexts/${encodeURIComponent(props.contextName)}`}
          aria-label="Back to notes list"
          class="icon-btn"
        >
          <ArrowLeft size={24} />
        </A>
        <h1 class="font-mono text-3xl">{formatDisplayDate(props.date)}</h1>
        {/* Move/delete only make sense for a note that already exists. */}
        <Show when={noteId()}>
          <ActionsMenu
            label="Note actions"
            items={[
              {
                label: "Move context",
                icon: ArrowRightLeft,
                onSelect: () => setMoveOpen(true),
              },
              {
                label: "Delete",
                icon: Trash2,
                onSelect: () => setDeleteOpen(true),
                destructive: true,
              },
            ]}
          />
        </Show>
        {/* Pushes the save button to the far right of this row. */}
        <div class="ml-auto flex items-center gap-1">
          {/* Submits the form below (see onSubmit on <form>). Swaps to a
              checkmark for a moment after a successful save (see
              justSaved/handleSave above), then reverts to the save
              icon. */}
          <button
            type="submit"
            aria-label={saving() ? "Saving…" : "Save"}
            class="icon-btn"
            disabled={saving()}
          >
            <Show when={justSaved()} fallback={<Save size={24} />}>
              <Check size={24} />
            </Show>
          </button>
        </div>
      </div>
      <ProseKit editor={editor}>
        {/* flex-1 min-h-0 makes this fill the remaining space in the
            form (header row + error + this), instead of growing with
            content. Toolbar keeps its natural height; the content div
            below takes the rest and scrolls on its own. */}
        <div class="notes-editor flex min-h-0 flex-1 flex-col">
          <Toolbar />
          <div
            ref={mountEditor}
            class="ProseMirror notes-editor-content min-h-0 flex-1 overflow-y-auto"
          />
        </div>
      </ProseKit>
      {error() && <p class="text-sm text-[#dc3545]">{error()}</p>}
      <Show when={noteId()}>
        <ComboboxDialog
          open={moveOpen()}
          onOpenChange={setMoveOpen}
          title="Move context"
          label=""
          options={moveTargets()}
          optionValue="id"
          optionLabel="context"
          placeholder="Search contexts…"
          errorMessage="Failed to move the note."
          onSubmit={handleMoveContext}
        />
        <ConfirmDialog
          open={deleteOpen()}
          onOpenChange={setDeleteOpen}
          title="Delete note?"
          description="This permanently deletes this note."
          confirmLabel="Delete"
          submittingLabel="Deleting…"
          errorMessage="Failed to delete the note."
          onConfirm={handleDeleteNote}
        />
      </Show>
    </form>
  );
}
