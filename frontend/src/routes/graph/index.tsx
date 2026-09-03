import { createSignal, onMount, Show } from "solid-js";

import pb from "../../lib/pb";
import { projects, projectsLoaded, loadProjects } from "../../lib/projects";
import Loading from "../../components/Loading";
import ConfirmDialog from "../../components/dialogs/ConfirmDialog";
import GraphCanvas from "./GraphCanvas";

// Matches the PocketBase "relations" collection schema. "subject" is
// the project a relation is derived FROM; "object" is the project
// derived from it, so every edge is drawn subject -> object.
export interface RelationRecord {
  id: string;
  subject: string; // relation id -> projects
  object: string; // relation id -> projects
  created: string;
  updated: string;
}

// Shows every project as a node and every "relations" record as a
// directed "derived from" edge. GraphCanvas owns rendering, layout,
// and drag interactions; this page only owns the PocketBase data and
// the delete-confirmation dialog, translating projects/relations into
// GraphCanvas's generic node/edge shape.
export default function Graph() {
  const [relations, setRelations] = createSignal<RelationRecord[]>([]);
  const [relationsLoaded, setRelationsLoaded] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pendingDeleteId, setPendingDeleteId] = createSignal<string | null>(
    null,
  );

  const loadRelations = async () => {
    try {
      const result = await pb
        .collection("relations")
        .getFullList<RelationRecord>();
      setRelations(result);
    } catch (err) {
      console.error("[graph] failed to load relations:", err);
    }
  };

  onMount(async () => {
    // loadProjects() just re-fetches the shared store, so calling it
    // again here is safe even if Sidebar already triggered it.
    await Promise.all([loadProjects(), loadRelations()]);
    setRelationsLoaded(true);
  });

  const handleConnect = async (sourceId: string, targetId: string) => {
    // Skip if this exact derivation relation already exists, so a
    // stray extra drag doesn't create a duplicate edge.
    const exists = relations().some(
      (r) => r.subject === sourceId && r.object === targetId,
    );
    if (exists) return;
    setError("");
    try {
      const record = await pb
        .collection("relations")
        .create<RelationRecord>({ subject: sourceId, object: targetId });
      setRelations((prev) => [...prev, record]);
    } catch {
      setError("Failed to add the relation.");
    }
  };

  const handleConfirmDelete = async () => {
    const id = pendingDeleteId();
    if (!id) return;
    await pb.collection("relations").delete(id);
    setRelations((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div class="flex h-full min-h-0 w-full flex-1 flex-col gap-4">
      <h1 class="font-sans text-4xl">Graph</h1>
      {error() && <p class="text-sm text-[#dc3545]">{error()}</p>}
      <Show when={relationsLoaded() && projectsLoaded()} fallback={<Loading />}>
        <GraphCanvas
          nodes={projects().map((p) => ({ id: p.id, label: p.label }))}
          edges={relations().map((r) => ({
            id: r.id,
            source: r.subject,
            target: r.object,
          }))}
          onConnect={handleConnect}
          onDeleteEdge={setPendingDeleteId}
        />
      </Show>
      <ConfirmDialog
        open={pendingDeleteId() !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Delete relation"
        description="Remove this derivation relation between the two projects?"
        onConfirm={handleConfirmDelete}
        confirmLabel="Delete"
        errorMessage="Failed to delete the relation."
      />
    </div>
  );
}
