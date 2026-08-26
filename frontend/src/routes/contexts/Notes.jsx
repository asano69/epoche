import { createSignal, createResource, Show } from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import Plus from "lucide-solid/icons/plus";
import Pencil from "lucide-solid/icons/pencil";
import Trash2 from "lucide-solid/icons/trash-2";
import ActionsMenu from "../../components/menus/ActionsMenu";
import NotesList from "../../components/notes/NotesList";

import pb from "../../lib/pb";
import {
  contextByName,
  renameContext,
  deleteContext,
} from "../../lib/contexts";
import { formatDisplayDate } from "../../lib/date";
import { notePath } from "../../lib/notePath";
import PromptDialog from "../../components/dialogs/PromptDialog";
import ConfirmDialog from "../../components/dialogs/ConfirmDialog";

// Today's date as "YYYY-MM-DD". Each context can only have one note per
// day, so the "New note" button always points at today's note, whether
// it already exists or not.
function todayDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Notes list for a single context, newest first. The paginated list
// itself lives in components/notes/NotesList.jsx, shared with the
// global "all notes" view (see routes/Home.jsx); this page only adds
// the context-specific chrome around it: title, rename/delete, and the
// "New note" shortcut.
export default function ContextNotes() {
  const params = useParams();
  // Context names come from the URL, so they may be percent-encoded.
  const contextName = () => decodeURIComponent(params.contextName);

  const navigate = useNavigate();
  // Backing "contexts" record for this page, used by the edit/delete
  // menu below for its id and current name. Derived from the shared
  // store (see lib/contexts.js) instead of a separate fetch, so it
  // reflects create/rename/delete done anywhere else in the app.
  const context = () => contextByName(contextName());
  const [editOpen, setEditOpen] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);

  // Only one note per context per day is allowed, so "New note" is
  // hidden once today's note already exists. Checked directly via its
  // own small query instead of inspecting NotesList's loaded notes,
  // since that state is now private to the shared component.
  const [todayNoteExists] = createResource(
    () => (context() ? [context().id, contextName()] : undefined),
    async ([contextId]) => {
      try {
        await pb.collection("notes").getFirstListItem(
          pb.filter("context = {:contextId} && date = {:date}", {
            contextId,
            date: todayDate(),
          }),
        );
        return true;
      } catch {
        return false;
      }
    },
  );

  // Renames the context, then navigates to its new URL so the address
  // bar and the notes list (which re-fetches when its filter changes,
  // see NotesList) both follow the new name.
  const handleRename = async (newName) => {
    await renameContext(context().id, newName);
    navigate(`/contexts/${encodeURIComponent(newName)}`);
  };

  const handleDelete = async () => {
    // Notes belonging to this context cascade-delete on the server
    // (see the "context" relation field's cascadeDelete in the
    // collections migration), so there's nothing else to clean up here.
    await deleteContext(context().id);
    navigate("/");
  };

  return (
    <div class="flex w-full flex-col gap-4 xl:mx-auto xl:max-w-3xl">
      <div class="flex items-center gap-4 mb-4">
        <h1 class="font-sans text-4xl">{contextName()}</h1>

        {/* Rename/delete menu for this context, styled like TopBar's
            UserMenu. Hidden until the context record has loaded, since
            both actions need its id. Placed right next to the title
            (not pushed to the far right) via gap-2 above instead of
            justify-between. */}
        <Show when={context()}>
          <ActionsMenu
            label="Context actions"
            items={[
              { label: "Rename", icon: Pencil, onSelect: () => setEditOpen(true) },
              {
                label: "Delete",
                icon: Trash2,
                onSelect: () => setDeleteOpen(true),
                destructive: true,
              },
            ]}
          />
        </Show>
      </div>

      {/* "New note" is styled and sized like NotesList's own rows so it
          reads as the first row of the same list. Hidden once today's
          note already exists (see todayNoteExists above), since this
          app allows only one note per day. */}
      <Show when={!todayNoteExists.loading && !todayNoteExists()}>
        <A
          href={notePath(contextName(), todayDate())}
          aria-label="New note"
          class="flex flex-col-reverse gap-1 border-b border-border py-4 pr-2 transition-colors hover:bg-hover-bg sm:flex-row sm:items-start sm:gap-2"
        >
          <div class="flex min-w-0 flex-1 items-center justify-center gap-2">
            <Plus size={20} />
            <span class="font-sans text-md">New note</span>
          </div>
          <span class="w-28 shrink-0 whitespace-nowrap text-right text-md font-mono sm:shrink-0 sm:whitespace-nowrap sm:text-md">
            {formatDisplayDate(todayDate())}
          </span>
        </A>
      </Show>

      <NotesList
        filter={pb.filter("context.context = {:name}", {
          name: contextName(),
        })}
      />

      <Show when={context()}>
        <PromptDialog
          open={editOpen()}
          onOpenChange={setEditOpen}
          title="Rename context"
          label=""
          initialValue={context().context}
          errorMessage="Failed to rename the context."
          onSubmit={handleRename}
        />
        <ConfirmDialog
          open={deleteOpen()}
          onOpenChange={setDeleteOpen}
          title="Delete context?"
          description={`This permanently deletes "${contextName()}" and all of its notes.`}
          confirmLabel="Delete"
          submittingLabel="Deleting…"
          errorMessage="Failed to delete the context."
          onConfirm={handleDelete}
        />
      </Show>
    </div>
  );
}
