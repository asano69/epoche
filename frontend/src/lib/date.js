// Converts a stored date string ("YYYY-MM-DD") into its display form
// ("YYYY/MM/DD"). Storage keeps the hyphenated form since it's what
// sorts and filters correctly in PocketBase queries.
export function formatDisplayDate(date) {
  return date.replaceAll("-", "/");
}
