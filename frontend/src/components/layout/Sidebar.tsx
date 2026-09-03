import { createSignal, createMemo, onMount, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { Search } from "@kobalte/core/search";
import { Select } from "@kobalte/core/select";
import SearchIcon from "lucide-solid/icons/search";
import { ChevronDown, Check } from "../../lib/icons";

import { projects, projectsLoaded, loadProjects } from "../../lib/projects";
import { workspaces, loadWorkspaces } from "../../lib/workspaces";
import Loading from "../Loading";

export interface SidebarProps {
  isMobile: boolean;
  open: boolean;
  onClose: () => void;
}

interface WorkspaceOption {
  id: string;
  label: string;
}

// Sentinel representing "no workspace filter". No real workspace record
// ever has an empty id, so this is safe to use as the default selection.
const ALL_WORKSPACES_OPTION: WorkspaceOption = { id: "", label: "All" };

// Visibility is fully controlled by `open`; no separate desktop/mobile
// behavior.
export default function Sidebar(props: SidebarProps) {
  const [query, setQuery] = createSignal("");

  // Workspace currently selected in the dropdown above the search box.
  // Defaults to "all workspaces" so the project list stays unfiltered by
  // workspace until the user picks one. Only remembered for as long as
  // Sidebar stays mounted (see the comment below), not persisted beyond
  // that.
  const [selectedWorkspace, setSelectedWorkspace] =
    createSignal<WorkspaceOption>(ALL_WORKSPACES_OPTION);

  // Sidebar is always mounted (see MainLayout), so this is the one place
  // that triggers the initial load of the shared projects/workspaces
  // stores.
  onMount(() => {
    loadProjects();
    loadWorkspaces();
  });

  const workspaceOptions = createMemo(() => [
    ALL_WORKSPACES_OPTION,
    ...workspaces().map((w) => ({ id: w.id, label: w.label })),
  ]);

  // Client-side filtering: Search's own options/suggestion machinery is
  // unused here (see options={[]} below), so this is what actually
  // reacts to the typed query. Workspace filtering happens first, then
  // the text query narrows further within that result.
  const filteredProjects = createMemo(() => {
    const q = query().trim().toLowerCase();
    const workspaceId = selectedWorkspace().id;
    return projects().filter((project) => {
      if (workspaceId && project.workspace !== workspaceId) return false;
      if (q && !project.label.toLowerCase().includes(q)) return false;
      return true;
    });
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
        <div class="flex flex-col gap-2 p-3">
          {/* Filters the project list below by workspace. "All" (the
              default) shows every project regardless of workspace. */}
          <Select<WorkspaceOption>
            options={workspaceOptions()}
            optionValue="id"
            optionTextValue="label"
            optionLabel="label"
            value={selectedWorkspace()}
            onChange={(option) => option && setSelectedWorkspace(option)}
            itemComponent={(itemProps) => (
              <Select.Item
                item={itemProps.item}
                class="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text outline-none transition-colors hover:bg-hover-bg data-[highlighted]:bg-hover-bg"
              >
                <Select.ItemLabel class="flex-1">
                  {itemProps.item.rawValue.label}
                </Select.ItemLabel>
                <Select.ItemIndicator>
                  <Check size={16} />
                </Select.ItemIndicator>
              </Select.Item>
            )}
          >
            <Select.Trigger class="flex items-center justify-between gap-2 rounded-md border border-border bg-field px-3 py-2 text-sm text-text">
              <Select.Value<WorkspaceOption>>
                {(state) => state.selectedOption().label}
              </Select.Value>
              <Select.Icon class="text-border">
                <ChevronDown size={16} />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content class="z-50 min-w-[160px] rounded-md border border-border bg-card p-1 shadow-popover outline-none font-sans">
                <Select.Listbox class="max-h-60 overflow-y-auto" />
              </Select.Content>
            </Select.Portal>
          </Select>

          {/* options stays empty and no Search.Portal/Content/Listbox is
              rendered: this only borrows Search's Control/Icon/Input
              parts for styling. onInputChange drives the plain list
              below instead of Search's built-in suggestion dropdown. */}
          <Search
            options={[]}
            triggerMode="manual"
            placeholder="Search projects…"
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
          <Show when={projectsLoaded()} fallback={<Loading />}>
            <Show
              when={filteredProjects().length > 0}
              fallback={
                <p class="px-2 py-1.5 text-sm text-border">
                  No projects found.
                </p>
              }
            >
              <For each={filteredProjects()}>
                {(project) => (
                  <A
                    href={`/projects/${encodeURIComponent(project.label)}`}
                    class="block rounded-md px-2 py-1.5 text-md text-text transition-colors hover:bg-hover-bg"
                  >
                    {project.label}
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
