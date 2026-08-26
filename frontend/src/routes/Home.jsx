import NotesList from "../components/notes/NotesList";

// All notes across every context, newest first, sharing the same
// paginated list as ContextNotes (see components/notes/NotesList.jsx).
// TopBar and Sidebar render once in AppShell (see lib/router.jsx), not
// per route.
export default function Home() {
  return (
    <div class="flex w-full flex-col gap-4 xl:mx-auto xl:max-w-3xl">
      <h1 class="mb-4 font-sans text-4xl"></h1>
      <NotesList />
    </div>
  );
}
