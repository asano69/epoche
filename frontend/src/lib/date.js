// Single source of truth for the display style (currently "17 Jul 2026").
// Change these options to change the format everywhere the app
// shows a date, without touching any call site.
const DATE_FORMAT_OPTIONS = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

const displayFormatter = new Intl.DateTimeFormat("en-GB", DATE_FORMAT_OPTIONS);

// Converts a stored date string ("YYYY-MM-DD") into its display form.
// Storage keeps the hyphenated ISO form since it's what sorts and
// filters correctly in PocketBase queries; only the rendered text
// changes here.
//
// Parsed as UTC (appending "T00:00:00Z") so the date doesn't shift by a
// day in timezones behind UTC, since "YYYY-MM-DD" alone is otherwise
// interpreted as UTC midnight by Date but displayed in local time by
// Intl.DateTimeFormat.
export function formatDisplayDate(date) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return displayFormatter.format(parsed);
}
