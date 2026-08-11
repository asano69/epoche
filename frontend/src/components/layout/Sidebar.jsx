import { Show } from "solid-js";

// Visibility is fully controlled by `open`; no separate desktop/mobile
// behavior.
export default function Sidebar(props) {
  return (
    <Show when={props.open}>
      <aside class="w-64 border-r border-[var(--color-border-soft)] bg-[var(--color-panel)]">
        <nav class="space-y-2 p-4">
          {/* Sidebar navigation items will go here */}
          <div class="text-sm text-[var(--color-border-soft)]">
            Navigation coming soon
          </div>
        </nav>
      </aside>
    </Show>
  );
}
