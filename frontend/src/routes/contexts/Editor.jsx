import { createSignal, onCleanup, Show, createResource, For } from "solid-js";
import { useParams, A } from "@solidjs/router";
import { contextByName, contextsLoaded } from "../../lib/contexts";
import { Button } from "@kobalte/core/button";
import ArrowLeft from "lucide-solid/icons/arrow-left";
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
import { formatDisplayDate } from "../../lib/date";
import Loading from "../../components/Loading";

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
  // Tracks the note's id locally: unset until the first save, at which
  // point it switches from create to update for any further save on
  // this same context/date without needing a page reload.
  const [noteId, setNoteId] = createSignal(props.noteId);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");

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
    } catch {
      setError("Failed to save the note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} class="flex w-full flex-col gap-4">
      <div class="flex items-center gap-3">
        {/* Back to this context's notes list. */}
        <A
          href={`/contexts/${encodeURIComponent(props.contextName)}`}
          aria-label="Back to notes list"
          class="icon-btn"
        >
          <ArrowLeft size={24} />
        </A>
        <h1 class="font-serif text-3xl">{formatDisplayDate(props.date)}</h1>
      </div>
      <ProseKit editor={editor}>
        <div class="notes-editor">
          <Toolbar />
          <div ref={mountEditor} class="ProseMirror notes-editor-content" />
        </div>
      </ProseKit>
      {error() && <p class="text-sm text-[#dc3545]">{error()}</p>}
      <Button type="submit" class="btn" disabled={saving()}>
        {saving() ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
