import { createStore } from "solid-js/store";
import pb from "./pb";

export interface ProjectRecord {
  id: string;
  label: string;
  description: string;
  created: string;
  updated: string;
}

// Shared list of every "projects" record, sorted alphabetically by
// label. A single module-level store (instead of each page fetching
// its own copy) keeps Sidebar's list in sync with the server.
const [state, setState] = createStore<{
  projects: ProjectRecord[];
  loaded: boolean;
}>({ projects: [], loaded: false });

export const projects = () => state.projects;
export const projectsLoaded = () => state.loaded;

// Fetches the full list from the server. Called once by Sidebar on
// mount.
export async function loadProjects() {
  const items = await pb
    .collection("projects")
    .getFullList<ProjectRecord>({ sort: "label" });
  setState({ projects: items, loaded: true });
}
