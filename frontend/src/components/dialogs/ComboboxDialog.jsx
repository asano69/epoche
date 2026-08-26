import { createSignal, createEffect } from "solid-js";
import { Dialog } from "@kobalte/core/dialog";
import { Combobox } from "@kobalte/core/combobox";
import X from "lucide-solid/icons/x";
import Check from "lucide-solid/icons/check";
import ChevronDown from "lucide-solid/icons/chevron-down";

// Reusable single-field "pick one from a list" dialog: a label, a
// searchable combobox, and Cancel/Save buttons. Mirrors PromptDialog's
// API (open/onOpenChange/onSubmit) so the two dialogs can be swapped
// for each other wherever a single-field form is needed.
//
// Props: open, onOpenChange, title, label, options (list of items),
// optionValue, optionLabel (field names read off each option),
// placeholder, initialValue, onSubmit (async (option) => void, receives
// the full selected option), submitLabel, submittingLabel, errorMessage.
export default function ComboboxDialog(props) {
  const [value, setValue] = createSignal(null);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal("");

  // This component stays mounted across opens/closes (only its Dialog
  // content mounts/unmounts internally), so the selection has to be
  // reset explicitly every time it opens.
  createEffect(() => {
    if (props.open) {
      setValue(props.initialValue ?? null);
      setError("");
    }
  });

  const handleOpenChange = (open) => {
    if (!open) setError("");
    props.onOpenChange(open);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value()) return;
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
    <Dialog open={props.open} onOpenChange={handleOpenChange}>
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
              {/* Combobox and confirm button share one row: no separate
                  full-width "Save" button anymore, just a check icon
                  button right next to the combobox. */}
              <div class="flex items-end gap-2">
                <Combobox
                  options={props.options}
                  optionValue={props.optionValue}
                  optionLabel={props.optionLabel}
                  optionTextValue={props.optionLabel}
                  value={value()}
                  onChange={setValue}
                  placeholder={props.placeholder}
                  itemComponent={(itemProps) => (
                    <Combobox.Item
                      item={itemProps.item}
                      class="cursor-pointer rounded-sm px-2 py-1.5 text-sm text-text outline-none data-[highlighted]:bg-hover-bg"
                    >
                      <Combobox.ItemLabel>
                        {itemProps.item.rawValue[props.optionLabel]}
                      </Combobox.ItemLabel>
                    </Combobox.Item>
                  )}
                  class="flex flex-1 flex-col gap-1"
                >
                  <Combobox.Label class="text-sm text-text">
                    {props.label}
                  </Combobox.Label>
                  <Combobox.Control class="flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2">
                    <Combobox.Input class="w-full bg-transparent text-sm text-text outline-none" />
                    <Combobox.Trigger class="text-border">
                      <Combobox.Icon>
                        <ChevronDown size={16} />
                      </Combobox.Icon>
                    </Combobox.Trigger>
                  </Combobox.Control>
                  <Combobox.Portal>
                    <Combobox.Content class="z-50 rounded-md border border-border bg-card p-1 shadow-popover">
                      <Combobox.Listbox class="max-h-60 overflow-y-auto" />
                    </Combobox.Content>
                  </Combobox.Portal>
                </Combobox>
                <button
                  type="submit"
                  aria-label={
                    submitting()
                      ? (props.submittingLabel ?? "Saving…")
                      : (props.submitLabel ?? "Save")
                  }
                  class="icon-btn shrink-0"
                  disabled={submitting() || !value()}
                >
                  <Check size={20} />
                </button>
              </div>
              {error() && <p class="text-sm text-[#dc3545]">{error()}</p>}
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
