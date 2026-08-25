import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { useParams, A } from "@solidjs/router";

import pb from "../../lib/pb";
import Loading from "../../components/Loading";

const PAGE_SIZE = 20;

// Pulls a short plain-text preview out of a note's ProseMirror JSON
// document, so cards show readable text instead of raw JSON.
function extractPreview(doc, maxLength = 140) {
  if (!doc) return "";
  let text = "";
  const walk = (node) => {
    if (text.length >= maxLength) return;
    if (node.text) text += node.text;
    else if (node.content) node.content.forEach(walk);
  };
  walk(doc);
  text = text.trim();
  return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
}

// Notes list for a single context, newest first, loaded page by page as
// the user scrolls (see the IntersectionObserver below).
export default function ContextNotes() {
  const params = useParams();
  // Context names come from the URL, so they may be percent-encoded.
  const contextName = () => decodeURIComponent(params.contextName);

  const [notes, setNotes] = createSignal([]);
  const [page, setPage] = createSignal(0);
  const [hasMore, setHasMore] = createSignal(true);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  // Set by the sentinel div's `ref` below; observed once mounted.
  let sentinel;
  let observer;

  const loadPage = async (pageNum) => {
    if (loading()) return;
    setLoading(true);
    setError("");
    try {
      const result = await pb.collection("notes").getList(pageNum, PAGE_SIZE, {
        // Filters by the related context's name rather than its id, since
        // that's what the URL carries. pb.filter() escapes the value
        // safely instead of interpolating it into the query string.
        filter: pb.filter("context.context = {:name}", {
          name: contextName(),
        }),
        sort: "-created",
      });
      setNotes((prev) =>
        pageNum === 1 ? result.items : [...prev, ...result.items],
      );
      setHasMore(pageNum < result.totalPages);
      setPage(pageNum);
    } catch {
      setError("Failed to load notes.");
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadPage(1);

    // Loads the next page once the sentinel element at the bottom of the
    // list scrolls into view. IntersectionObserver's default root (the
    // viewport) still respects clipping from MainLayout's scrollable
    // <main>, so this works without pointing root at that container
    // explicitly.
    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore() && !loading()) {
        loadPage(page() + 1);
      }
    });
    if (sentinel) observer.observe(sentinel);
  });

  onCleanup(() => observer?.disconnect());

  return (
    <div class="flex flex-col gap-4">
      <h1 class="font-serif text-2xl">{contextName()}</h1>

      <Show when={error()}>
        <p class="text-sm text-[#dc3545]">{error()}</p>
      </Show>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <For each={notes()}>
          {(note) => (
            <A
              href={`/notes/${note.id}`}
              class="flex flex-col gap-2 rounded-md border border-border bg-card p-4 shadow-card transition-colors hover:bg-hover-bg"
            >
              <span class="text-xs text-border">
                {new Date(note.created).toLocaleString()}
              </span>
              <p class="text-sm text-text">
                {extractPreview(note.note) || "(empty note)"}
              </p>
            </A>
          )}
        </For>
      </div>

      <Show when={!loading() && notes().length === 0}>
        <p class="text-sm text-border">No notes yet.</p>
      </Show>

      <Show when={loading()}>
        <Loading />
      </Show>

      {/* Observed by IntersectionObserver to trigger the next page load. */}
      <div ref={sentinel} class="h-1" />
    </div>
  );
}
