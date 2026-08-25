import { Router, Route } from "@solidjs/router";

import AppShell from "../components/layout/AppShell";
import Home from "../routes/Home";
import NoteEditor from "../routes/contexts/Editor";
import ContextNotes from "../routes/contexts/Notes";

// All top-level routes in one place, so adding or removing a page never
// requires touching main.jsx.
//
// AppShell is passed as `root` rather than wrapped around <Router> here,
// so its contents (e.g. NavBar's <A> links) render inside the router
// context instead of erroring outside a Route.
export default function AppRouter() {
  return (
    <Router root={AppShell}>
      {/* Placeholder until a proper home/context-picker page exists. */}
      <Route path="/" component={Home} />
      {/* A note is addressed by its context and date, not by id: this
          keeps the URL self-descriptive and matches the "one note per
          context per day" rule enforced by the notes collection's
          unique index on (context, date). "contexts" (plural), matching
          the "/contexts/:contextName" list route below. */}
      <Route
        path="/contexts/:contextName/:year/:month/:day"
        component={NoteEditor}
      />
      <Route path="/contexts/:contextName" component={ContextNotes} />
    </Router>
  );
}
