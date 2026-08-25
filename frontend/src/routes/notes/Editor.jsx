import { createSignal, onMount, onCleanup, Show, createResource, For } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { Button } from "@kobalte/core/button";
import { Editor as TiptapEditor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

import pb from "../../lib/pb";
import Loading from "../../components/Loading";

// Note editor page, used both to create a new note ("/notes/new") and to
// edit an existing one ("/notes/:id"). The editor's content is stored as
// a ProseMirror JSON document (Editor#getJSON()) in the note's json
// field, so no HTML/Delta conversion is needed on save or load.
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

// Toolbar buttons, each backed by a StarterKit command. Kept as a plain
// list (rather than one JSX block per button) so adding a formatting
// option later is a one-line change.
const TOOLBAR_ITEMS = [
  { label: "B", name: "bold", run: (editor) => editor.chain().focus().toggleBold().run() },
  { label: "I", name: "italic", run: (editor) => editor.chain().focus().toggleItalic().run() },
  {
    label: "H2",
    name: "heading",
    attrs: { level: 2 },
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  { label: "•", name: "bulletList", run: (editor) => editor.chain().focus().toggleBulletList().run() },
  { label: "1.", name: "orderedList", run: (editor) => editor.chain().focus().toggleOrderedList().run() },
];

// Split out from Editor so onMount fires fresh every time the form is
// (re)inserted, e.g. once an existing note's data has finished loading.
// Creating the editor any earlier would mean passing content into an
// editor that isn't attached to the DOM yet.
function NoteForm(props) {
  const navigate = useNavigate();
  let editorEl;

  const [editor, setEditor] = createSignal(null);
  // Bumped on every editor transaction (typing, selection change, ...).
  // Plain Editor instances aren't reactive on their own, so toolbar
  // buttons read this signal to know when to re-check isActive().
  const [tick, setTick] = createSignal(0);

  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");

  onMount(() => {
    const instance = new TiptapEditor({
      element: editorEl,
      extensions: [StarterKit],
      content: props.initialContent ?? "",
      onTransaction: () => setTick((t) => t + 1),
    });
    setEditor(instance);
  });

  onCleanup(() => editor()?.destroy());

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = { note: editor().getJSON() };
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
      <div class="notes-editor">
        <div class="notes-toolbar">
          <For each={TOOLBAR_ITEMS}>
            {(item) => <ToolbarButton editor={editor} tick={tick} item={item} />}
          </For>
        </div>
        <div ref={editorEl} class="notes-editor-content" />
      </div>
      {error() && <p class="text-sm text-[#dc3545]">{error()}</p>}
      <Button type="submit" class="btn" disabled={saving()}>
        {saving() ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

// A single toolbar button. `props.tick` is read (but not used) inside
// isActive() purely to subscribe to editor transactions -- Solid
// re-evaluates isActive() whenever tick() changes.
function ToolbarButton(props) {
  const isActive = () => {
    props.tick();
    const instance = props.editor();
    return instance ? instance.isActive(props.item.name, props.item.attrs) : false;
  };

  return (
    <button
      type="button"
      onClick={() => {
        const instance = props.editor();
        if (instance) props.item.run(instance);
      }}
      classList={{ "is-active": isActive() }}
    >
      {props.item.label}
    </button>
  );
}
