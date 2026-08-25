import { createSignal } from "solid-js";
import { AlertDialog } from "@kobalte/core/alert-dialog";

// Reusable "are you sure?" confirmation dialog. Fully controlled via
// `open`/`onOpenChange` so it can be opened from anywhere (e.g. a
// dropdown menu item) instead of needing its own AlertDialog.Trigger.
//
// Props: open, onOpenChange, title, description, onConfirm
// (async () => void), confirmLabel, submittingLabel, errorMessage.
export default function ConfirmDialog(props) {
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal("");

  const handleOpenChange = (open) => {
    // Drop any stale error once the dialog closes, however it closed
    // (confirm, cancel, Esc, or the overlay).
    if (!open) setError("");
    props.onOpenChange(open);
  };

  const handleConfirm = async () => {
    setError("");
    setSubmitting(true);
    try {
      await props.onConfirm();
      props.onOpenChange(false);
    } catch {
      setError(props.errorMessage ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={props.open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay class="fixed inset-0 z-50 bg-black/40" />
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <AlertDialog.Content class="w-full max-w-sm rounded-md border border-border bg-card p-6 shadow-popover">
            <AlertDialog.Title class="text-lg font-sans">
              {props.title}
            </AlertDialog.Title>
            <AlertDialog.Description class="mt-2 text-sm text-border">
              {props.description}
            </AlertDialog.Description>
            {error() && <p class="mt-2 text-sm text-[#dc3545]">{error()}</p>}
            <div class="mt-6 flex justify-end gap-2">
              <AlertDialog.CloseButton type="button" class="btn">
                Cancel
              </AlertDialog.CloseButton>
              <button
                type="button"
                class="btn"
                disabled={submitting()}
                onClick={handleConfirm}
              >
                {submitting()
                  ? (props.submittingLabel ?? "Working…")
                  : (props.confirmLabel ?? "Confirm")}
              </button>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}
