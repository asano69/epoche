import { Show } from "solid-js";

export default function Sidebar(props) {
  return (
    <aside class="hidden w-64 border-r border-[var(--color-border-soft)] bg-[var(--color-panel)] md:block">
      <nav class="space-y-2 p-4">
        {/* Sidebar navigation items will go here */}
        <div class="text-sm text-[var(--color-border-soft)]">
          Navigation coming soon
        </div>
      </nav>
    </aside>
  );
}
