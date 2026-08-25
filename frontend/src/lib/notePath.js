// Builds the "/contexts/:contextName/:year/:month/:day" path for a
// note, splitting its "date" field (stored as "YYYY-MM-DD") into
// segments. Shared by the notes list (link to each note) and the
// editor (redirect after moving a note to a different context).
export function notePath(contextName, date) {
  const [year, month, day] = date.split("-");
  return `/contexts/${encodeURIComponent(contextName)}/${year}/${month}/${day}`;
}
