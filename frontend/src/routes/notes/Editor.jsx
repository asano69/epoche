import { createSignal, onMount, Show, createResource } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { Button } from "@kobalte/core/button";
import Quill from "quill";
import "quill/dist/quill.snow.css";

import pb from "../../lib/pb";
import Loading from "../../components/Loading";

// Note editor page, used both to create a new note ("/notes/new") and to
// edit an existing one ("/notes/:id"). Quill's Delta output is stored
// as-is in the note's json field, so no HTML conversion is needed on
// save or load. Quill's default "snow" theme colors are overridden in
// style.css (under the .notes-editor scope) to match the app's design
// tokens instead of Quill's default blue accent.
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

// Split out from Editor so onMount fires fresh every time the form is
// (re)inserted, e.g. once an existing note's data has finished loading.
// Creating Quill any earlier would mean calling setContents on an editor
// that isn't attached to the DOM yet.
function NoteForm(props) {
  const navigate = useNavigate();
  let editorEl;
  let quill;

  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");

  onMount(() => {
    quill = new Quill(editorEl, { theme: "snow" });
    if (props.initialContent) {
      quill.setContents(props.initialContent);
    }
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = { note: quill.getContents() };
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
      <div ref={editorEl} class="notes-editor" />
      {error() && <p class="text-sm text-[#dc3545]">{error()}</p>}
      <Button type="submit" class="btn" disabled={saving()}>
        {saving() ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
