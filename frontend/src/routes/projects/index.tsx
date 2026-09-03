import { createSignal, createResource, For, Show, onMount } from "solid-js";
import { useParams } from "@solidjs/router";
import { TextField } from "@kobalte/core/text-field";
import { Plus } from "../../lib/icons";

import pb from "../../lib/pb";
import { formatDisplayDate, todayDate } from "../../lib/date";
import DateNav from "../../components/DateNav";
import Loading from "../../components/Loading";
import type { ProjectRecord } from "../../lib/projects";

// Matches the PocketBase "activities" collection schema. "detail" is
// left out for now -- this page only ever writes/reads "summary".
export interface ActivityRecord {
  id: string;
  project: string; // relation id, points at the "projects" collection
  date: string; // "YYYY-MM-DD"
  summary: string;
  created: string;
  updated: string;
}

// Sidebar links to a project by its (URL-safe) label, not its id, so
// the id needed for the "activities.project" relation is resolved
// here via a lookup.
async function fetchProjectByLabel(
  label: string,
): Promise<ProjectRecord | null> {
  try {
    return await pb
      .collection("projects")
      .getFirstListItem<ProjectRecord>(
        pb.filter("label = {:label}", { label }),
      );
  } catch {
    return null;
  }
}

// Project detail page: for now this is just a short-form activity log
// (see ActivityLog below) -- a one-line "what happened" entry plus the
// full history table for the project, newest first.
export default function ProjectDetail() {
  const params = useParams<{ label: string }>();
  const [project] = createResource(() => params.label, fetchProjectByLabel);

  return (
    <div class="flex w-full flex-col gap-4 xl:mx-auto xl:max-w-3xl">
      <Show when={!project.loading} fallback={<Loading />}>
        <Show
          when={project()}
          fallback={<p class="text-sm text-border">Project not found.</p>}
        >
          {(project) => <ActivityLog project={project()} />}
        </Show>
      </Show>
    </div>
  );
}

interface ActivityLogProps {
  project: ProjectRecord;
}

function ActivityLog(props: ActivityLogProps) {
  const [activities, setActivities] = createSignal<ActivityRecord[]>([]);
  // Date to record the next entry under. Defaults to today, but can be
  // moved back via DateNav (e.g. to log something noticed after the
  // fact) without affecting which activities are shown -- the table
  // below always lists the project's full history.
  const [date, setDate] = createSignal(todayDate());
  const [summary, setSummary] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal("");

  const loadActivities = async () => {
    try {
      const result = await pb
        .collection("activities")
        .getFullList<ActivityRecord>({
          filter: pb.filter("project = {:project}", {
            project: props.project.id,
          }),
          sort: "-date,-created",
        });
      setActivities(result);
    } catch (err) {
      console.error("[activities] failed to load:", err);
    }
  };

  onMount(loadActivities);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!summary().trim()) return;
    setError("");
    setSubmitting(true);
    try {
      await pb.collection("activities").create<ActivityRecord>({
        project: props.project.id,
        date: date(),
        summary: summary().trim(),
      });
      setSummary("");
      // Refetch rather than splicing the new record in locally: the
      // chosen date may not be today, so the correct sorted position
      // isn't necessarily the front of the list.
      await loadActivities();
    } catch {
      setError("Failed to add the activity.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="flex flex-col gap-4">
      <h1 class="font-sans text-4xl">{props.project.label}</h1>

      <DateNav date={date()} onChange={setDate} />

      <form onSubmit={handleSubmit} class="flex items-center gap-2">
        <TextField value={summary()} onChange={setSummary} class="flex-1">
          <TextField.Input
            placeholder="What happened?"
            class="w-full rounded-md border border-border bg-field px-3 py-2 text-text"
          />
        </TextField>
        <button
          type="submit"
          aria-label={submitting() ? "Adding…" : "Add activity"}
          class="icon-btn shrink-0"
          disabled={submitting()}
        >
          <Plus size={20} />
        </button>
      </form>
      {error() && <p class="text-sm text-[#dc3545]">{error()}</p>}

      <table class="w-full border-collapse text-left text-sm">
        <thead>
          <tr class="border-b border-border">
            <th class="w-28 py-2 pr-2 font-sans">Date</th>
            <th class="py-2 font-sans">Summary</th>
          </tr>
        </thead>
        <tbody>
          <For each={activities()}>
            {(activity) => (
              <tr class="border-b border-border">
                <td class="py-2 pr-2 font-mono">
                  {formatDisplayDate(activity.date)}
                </td>
                <td class="py-2">{activity.summary}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <Show when={activities().length === 0}>
        <p class="text-sm text-border">No activities yet.</p>
      </Show>
    </div>
  );
}
