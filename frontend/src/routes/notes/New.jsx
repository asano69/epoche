import { createSignal, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { TextField } from "@kobalte/core/text-field";
import { Button } from "@kobalte/core/button";
import Quill from "quill";
import "quill/dist/quill.snow.css";

import pb from "../../lib/pb";

// Note creation page. Quill's Delta output is stored as-is in the note's
// json field, so no HTML conversion is needed on save or (later) on load.
// Quill's default "snow" theme colors are overridden in style.css (under
// the .notes-editor scope) to match the app's design tokens instead of
// Quill's default blue accent.
export default function NoteNew() {
  const navigate = useNavigate();
  let editorEl;
  let quill;

  const [title, setTitle] = createSignal("");
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");

  onMount(() => {
    quill = new Quill(editorEl, { theme: "snow" });
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await pb.collection("notes").create({
        title: title(),
        note: quill.getContents(),
      });
      navigate("/notes/new");
    } catch {
      setError("Failed to save the note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} class="flex w-full flex-col gap-4">
      <TextField
        value={title()}
        onChange={setTitle}
        class="flex flex-col gap-1"
      >
        <TextField.Label class="text-sm font-semibold">
          Title
        </TextField.Label>
        <TextField.Input class="rounded-md border border-[var(--color-border-soft)] bg-[var(--color-field)] px-3 py-2 text-[var(--color-text)]" />
      </TextField>
      <div ref={editorEl} class="notes-editor" />
      {error() && <p class="text-sm text-[#dc3545]">{error()}</p>}
      <Button type="submit" class="btn" disabled={saving()}>
        {saving() ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
