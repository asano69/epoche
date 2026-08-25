import { createStore } from "solid-js/store";
import pb from "./pb";

// Shared list of every "contexts" record, sorted alphabetically. A
// single module-level store (instead of each page fetching its own
// copy) keeps Sidebar's list in sync whenever a context is created,
// renamed, or deleted anywhere else in the app.
const [state, setState] = createStore({ contexts: [], loaded: false });

export const contexts = () => state.contexts;
export const contextsLoaded = () => state.loaded;

// Looks up a context by name from the already-loaded store, instead of
// a separate per-page fetch. Used by pages that only have the name
// from the URL (see routes/notes/Editor.jsx and
// routes/contexts/Notes.jsx).
export function contextByName(name) {
  return contexts().find((c) => c.context === name);
}

function sortByName(list) {
  return [...list].sort((a, b) => a.context.localeCompare(b.context));
}

// Fetches the full list from the server. Called once by Sidebar on
// mount; the create/rename/delete helpers below patch the store
// directly instead of re-fetching from the server.
export async function loadContexts() {
  const items = await pb
    .collection("contexts")
    .getFullList({ sort: "context" });
  setState({ contexts: items, loaded: true });
}

export async function createContext(name) {
  const record = await pb.collection("contexts").create({ context: name });
  setState("contexts", (list) => sortByName([...list, record]));
  return record;
}

export async function renameContext(id, name) {
  const record = await pb
    .collection("contexts")
    .update(id, { context: name });
  setState("contexts", (list) =>
    sortByName(list.map((c) => (c.id === id ? record : c))),
  );
  return record;
}

export async function deleteContext(id) {
  await pb.collection("contexts").delete(id);
  setState("contexts", (list) => list.filter((c) => c.id !== id));
}
