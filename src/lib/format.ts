// Post dates are plain YYYY-MM-DD (Keystatic's date field), which parse as
// UTC midnight — format in UTC too so the day never shifts with the build
// machine's timezone.
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
