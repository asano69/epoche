import { createSignal, createMemo, onMount, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Search } from "@kobalte/core/search";
import SearchIcon from "lucide-solid/icons/search";

import { contexts, contextsLoaded, loadContexts } from "../../lib/contexts";
import Loading from "../Loading";

// Visibility is fully controlled by `open`; no separate desktop/mobile
// behavior.
export default function Sidebar(props) {
  const [query, setQuery] = createSignal("");

  // Sidebar is always mounted (see MainLayout), so this is the one place
  // that triggers the initial load of the shared contexts store. Once
  // loaded, create/rename/delete elsewhere in the app keep it in sync
  // without Sidebar needing to re-fetch.
  onMount(() => {
    loadContexts();
  });

  // Client-side filtering: Search's own options/suggestion machinery is
  // unused here (see options={[]} below), so this is what actually
  // reacts to the typed query.
  const filteredContexts = createMemo(() => {
    const q = query().trim().toLowerCase();
    if (!q) return contexts();
    return contexts().filter((context) =>
      context.context.toLowerCase().includes(q),
    );
  });

  return (
    <Show when={props.open}>
      {/* Backdrop only exists on mobile: clicking it closes the overlay,
          and it visually separates the sidebar from the content behind it. */}
      <Show when={props.isMobile}>
        <div
          class="absolute inset-0 z-20 bg-black/40"
          onClick={props.onClose}
        />
      </Show>
      <aside
        classList={{
          "absolute inset-y-0 left-0 z-30 shadow-popover": props.isMobile,
        }}
        class="flex h-full min-h-0 w-64 flex-col border-r border-border bg-bg"
      >
        <div class="p-3">
          {/* options stays empty and no Search.Portal/Content/Listbox is
              rendered: this only borrows Search's Control/Icon/Input
              parts for styling. onInputChange drives the plain list
              below instead of Search's built-in suggestion dropdown. */}
          <Search
            options={[]}
            triggerMode="manual"
            placeholder="Search contexts…"
            onInputChange={setQuery}
          >
            <Search.Control class="flex items-center gap-2 rounded-md border border-border bg-field px-3 py-2">
              <Search.Icon class="text-border">
                <SearchIcon size={16} />
              </Search.Icon>
              <Search.Input class="w-full bg-transparent text-sm text-text outline-none" />
            </Search.Control>
          </Search>
        </div>

        {/* Scrolls independently of MainLayout's <main>: this nav owns
            its own overflow-y-auto within the fixed-height <aside>
            (h-full, bounded by MainLayout's min-h-0 flex row). */}
        <nav class="flex-1 overflow-y-auto p-2">
          <Show when={contextsLoaded()} fallback={<Loading />}>
            <Show
              when={filteredContexts().length > 0}
              fallback={
                <p class="px-2 py-1.5 text-sm text-border">
                  No contexts found.
                </p>
              }
            >
              <For each={filteredContexts()}>
                {(context) => (
                  <A
                    href={`/contexts/${encodeURIComponent(context.context)}`}
                    class="block rounded-md px-2 py-1.5 text-md text-text transition-colors hover:bg-hover-bg"
                  >
                    {context.context}
                  </A>
                )}
              </For>
            </Show>
          </Show>
        </nav>
      </aside>
    </Show>
  );
}
