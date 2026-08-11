import { Router, Route, Navigate } from "@solidjs/router";

import AppShell from "../components/layout/AppShell";
import NoteEditor from "../routes/notes/Editor";

// All top-level routes in one place, so adding or removing a page never
// requires touching main.jsx.
//
// AppShell is passed as `root` rather than wrapped around <Router> here,
// so its contents (e.g. NavBar's <A> links) render inside the router
// context instead of erroring outside a Route.
export default function AppRouter() {
  return (
    <Router root={AppShell}>
      {/* Temporary: redirect the root path to the note editor until a
          proper home/list page exists. */}
      <Route path="/" component={() => <Navigate href="/notes/new" />} />
      {/* "/notes/new" must be registered before "/notes/:id" so the
          literal path wins over the dynamic one. */}
      <Route path="/notes/new" component={NoteEditor} />
      <Route path="/notes/:id" component={NoteEditor} />
    </Router>
  );
}
