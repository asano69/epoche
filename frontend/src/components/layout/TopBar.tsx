import { For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Menu, X, Cone as Focus, Notebook, Network } from "../../lib/icons";
import Logo from "../Logo";

import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export interface TopBarProps {
  isMobile: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

// Top-level nav items, moved here from Sidebar (which now shows the
// context list instead of these static links). Kept as plain data so
// each entry is just a {href, label, icon} tuple instead of
// duplicating the same <A> markup.
const NAV_ITEMS = [
  { href: "/focus", label: "Focus", icon: Focus },
  { href: "/diary", label: "Diary", icon: Notebook },
  { href: "/graph", label: "Graph", icon: Network },
];

// The hamburger button here only toggles the Sidebar (owned by
// MainLayout, passed in as sidebarOpen/onToggleSidebar). There is no
// separate mobile-only menu anymore.
export default function TopBar(props: TopBarProps) {
  return (
    <header class="sticky top-0 z-40 p-2 border-b border-border bg-nav">
      <div class="flex justify-between px-2 md:px-8">
        <div class="flex items-center gap-3">
          {/* Toggle button only exists on mobile; on desktop the
              sidebar is always visible so there's nothing to toggle. */}
          <Show when={props.isMobile}>
            <button
              type="button"
              onClick={() => props.onToggleSidebar()}
              aria-label="Toggle sidebar"
              aria-expanded={props.sidebarOpen}
              class="icon-btn"
            >
              {props.sidebarOpen ? <X size={30} /> : <Menu size={30} />}
            </button>
          </Show>
          {/* Version hidden on mobile: there isn't room for it next to
              the hamburger toggle and title. */}
          <Logo showTitle linkable showVersion={!props.isMobile} />
        </div>

        <nav class="flex items-center gap-1">
          <For each={NAV_ITEMS}>
            {(item) => (
              <A
                href={item.href}
                end
                activeClass="bg-active-bg"
                aria-label={item.label}
                class="icon-btn"
              >
                <item.icon size={22} />
              </A>
            )}
          </For>
          <ThemeToggle />
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
