import { createSignal, createEffect } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { TextField } from "@kobalte/core/text-field";
import X from "lucide-solid/icons/x";

// Reusable single-field "edit" dialog: a label, a textarea, and
// Cancel/Save buttons. Fully controlled via `open`/`onOpenChange` so it
// can be opened from anywhere (e.g. a dropdown menu item) instead of
// needing its own Dialog.Trigger next to it.
//
// Props: open, onOpenChange, title, label, initialValue, onSubmit
// (async (value) => void), submitLabel, submittingLabel, errorMessage.
export default function PromptDialog(props) {
  const [value, setValue] = createSignal(props.initialValue ?? "");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal("");

  // This component stays mounted across opens/closes (only its Dialog
  // content mounts/unmounts internally), so the field has to be reset
  // to the current initialValue explicitly every time it opens.
  createEffect(() => {
    if (props.open) {
      setValue(props.initialValue ?? "");
      setError("");
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await props.onSubmit(value());
      props.onOpenChange(false);
    } catch {
      setError(props.errorMessage ?? "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/40" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content class="w-full max-w-sm rounded-md border border-border bg-card p-6 shadow-popover">
            <div class="mb-4 flex items-center justify-between">
              <Dialog.Title class="text-lg font-sans">
                {props.title}
              </Dialog.Title>
              <Dialog.CloseButton
                aria-label="Close"
                class="rounded-md p-1 text-text transition-colors hover:bg-hover-bg"
              >
                <X size={18} />
              </Dialog.CloseButton>
            </div>
            <form onSubmit={handleSubmit} class="flex flex-col gap-4">
              <TextField
                value={value()}
                onChange={setValue}
                class="flex flex-col gap-1"
              >
                <TextField.Label class="text-sm text-text">
                  {props.label}
                </TextField.Label>
                <TextField.Input
                  autofocus
                  class="rounded-md border border-border bg-bg px-3 py-2 text-text"
                />
              </TextField>
              {error() && <p class="text-sm text-[#dc3545]">{error()}</p>}
              <div class="flex justify-end gap-2">
                <Dialog.CloseButton type="button" class="btn">
                  Cancel
                </Dialog.CloseButton>
                <button type="submit" class="btn" disabled={submitting()}>
                  {submitting()
                    ? (props.submittingLabel ?? "Saving…")
                    : (props.submitLabel ?? "Save")}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
