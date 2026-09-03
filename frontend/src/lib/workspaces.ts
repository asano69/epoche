import { createStore } from "solid-js/store";
import pb from "./pb";

export interface WorkspaceRecord {
  id: string;
  label: string;
  description: string;
  created: string;
  updated: string;
}

// Shared list of every "workspaces" record, sorted alphabetically by
// label. Mirrors lib/projects.ts's pattern: a single module-level store
// so every consumer (currently just Sidebar's workspace filter) sees
// the same data instead of each fetching its own copy.
const [state, setState] = createStore<{
  workspaces: WorkspaceRecord[];
  loaded: boolean;
}>({ workspaces: [], loaded: false });

export const workspaces = () => state.workspaces;
export const workspacesLoaded = () => state.loaded;

// Fetches the full list from the server. Called once by Sidebar on
// mount.
export async function loadWorkspaces() {
  const items = await pb
    .collection("workspaces")
    .getFullList<WorkspaceRecord>({ sort: "label" });
  setState({ workspaces: items, loaded: true });
}
