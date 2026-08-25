import { createSignal, onCleanup, Show, createResource, For } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { Button } from "@kobalte/core/button";
import "prosekit/basic/style.css";
import "prosekit/basic/typography.css";
import { defineBasicExtension } from "prosekit/basic";
import { createEditor } from "prosekit/core";
import { ProseKit, useEditorDerivedValue } from "prosekit/solid";

import pb from "../../lib/pb";
import Loading from "../../components/Loading";

// Note editor page, used both to create a new note ("/notes/new") and to
// edit an existing one ("/notes/:id"). The editor's content is stored as
// a ProseMirror JSON document (Editor#getDocJSON()) in the note's json
// field, so no HTML conversion is needed on save or load.
export default function Editor() {
  const params = useParams();
  // Only fetches when params.id is set, i.e. when editing an existing
  // note; createResource simply never runs the fetcher for "/notes/new".
  const [note] = createResource(
    () => params.id,
    (id) => pb.collection("notes").getOne(id),
  );

  return (
    <Show when={!params.id || note()} fallback={<Loading />}>
      <NoteForm id={params.id} initialContent={note()?.note} />
    </Show>
  );
}

// Toolbar buttons, each backed by a ProseKit command. Kept as a plain
// list so adding a formatting option later is a one-line change.
const TOOLBAR_ITEMS = [
  { key: "bold", label: "B" },
  { key: "italic", label: "I" },
  { key: "heading", label: "H2" },
  { key: "bulletList", label: "•" },
  { key: "orderedList", label: "1." },
];

// Derives { isActive, canExec, command } for every toolbar button from
// the current editor state. Passed to useEditorDerivedValue, which
// re-runs it on every ProseMirror transaction.
function getToolbarItems(editor) {
  return {
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
    heading: {
      isActive: editor.nodes.heading.isActive({ level: 2 }),
      canExec: editor.commands.toggleHeading.canExec({ level: 2 }),
      command: () => editor.commands.toggleHeading({ level: 2 }),
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
      <For each={TOOLBAR_ITEMS}>
        {({ key, label }) => (
          <Show when={items()[key]}>
            {(item) => (
              <button
                type="button"
                disabled={!item().canExec}
                onClick={item().command}
                classList={{ "is-active": item().isActive }}
              >
                {label}
              </button>
            )}
          </Show>
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

  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = { note: editor.getDocJSON() };
      if (props.id) {
        await pb.collection("notes").update(props.id, data);
      } else {
        const record = await pb.collection("notes").create(data);
        // Switch to the new note's edit URL so further saves update it
        // instead of creating duplicates.
        navigate(`/notes/${record.id}`);
        return;
      }
    } catch {
      setError("Failed to save the note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} class="flex w-full flex-col gap-4">
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
