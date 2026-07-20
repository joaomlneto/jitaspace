const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Formats an ISO date (`YYYY-MM-DD`) as a short, locale-independent label such
 * as `Jun 1, 2026`. Parsing is done manually (no `new Date()`) so the output is
 * deterministic and identical on the server and client — avoiding hydration
 * mismatches.
 */
export function formatNewsDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day || month < 1 || month > 12) return iso;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}
