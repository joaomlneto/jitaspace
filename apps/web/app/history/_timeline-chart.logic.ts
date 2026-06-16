import type { HistoryIndex } from "~/lib/history";
import { collectionMeta } from "~/lib/history";

/**
 * Pure data-shaping for the history timeline chart. Kept free of React and of
 * `@mantine/charts` so it can be unit-tested directly; the client component in
 * `_timeline-chart.tsx` just renders the model this produces.
 */

export type HistoryBuild = HistoryIndex["builds"][number];

export interface TimelineChartSeries {
  /** Collection key — also the per-week data-row key the chart reads. */
  name: string;
  /** Human label (from `collectionMeta`), shown in the legend/tooltip. */
  label: string;
  /** Mantine chart color reference, e.g. `"violet.6"`. */
  color: string;
}

export interface TimelineChartModel {
  /** One row per week: `{ week: "YYYY-MM-DD", [collection]: count }`. */
  data: Record<string, number | string>[];
  /** Stacked series, largest total first (stable base of the stack). */
  series: TimelineChartSeries[];
  /** Total changes across every week and series shown. */
  totalChanges: number;
  /** Whether quiet weeks were filled in (`false` ⇒ only populated weeks). */
  continuous: boolean;
}

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Past this many weeks the gaps between populated weeks are no longer filled —
 * a single very old build date would otherwise generate thousands of zero bars.
 */
export const MAX_CONTINUOUS_WEEKS = 520;

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

const isoToUtc = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

/** Monday (UTC) of the ISO week containing `date` (a `"YYYY-MM-DD"` string). */
export function weekStart(date: string): string {
  const d = isoToUtc(date);
  const dow = d.getUTCDay(); // 0 = Sun … 6 = Sat
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().slice(0, 10);
}

/** `iso` shifted by `n` whole weeks (UTC), as a `"YYYY-MM-DD"` string. */
export function addWeeks(iso: string, n: number): string {
  return new Date(isoToUtc(iso).getTime() + n * WEEK_MS)
    .toISOString()
    .slice(0, 10);
}

/** Compact x-axis tick: `"2025-01-06"` → `"Jan '25"`. */
export function formatWeekTick(iso: string): string {
  const [year = "", month = "1"] = iso.split("-");
  return `${MONTHS[Number(month) - 1] ?? ""} '${year.slice(2)}`;
}

/** Per-collection change counts for a build (legacy types-only fallback). */
function buildCounts(build: HistoryBuild): Record<string, number> {
  if (build.byCollection) return build.byCollection;
  return build.changeCount > 0 ? { types: build.changeCount } : {};
}

/**
 * Fold the per-build change index into a weekly, per-collection stacked-bar
 * model, keeping only the `active` collections. Builds without a date can't be
 * placed on a time axis and are skipped.
 */
export function buildTimelineChartModel(
  builds: HistoryBuild[],
  active: string[],
): TimelineChartModel {
  const wanted = new Set(active);
  const empty: TimelineChartModel = {
    data: [],
    series: [],
    totalChanges: 0,
    continuous: true,
  };

  // sum each active collection into its ISO-week bucket
  const byWeek = new Map<string, Record<string, number>>();
  const seriesTotals = new Map<string, number>();
  for (const build of builds) {
    if (!build.date) continue;
    let week: string | undefined;
    for (const [collection, n] of Object.entries(buildCounts(build))) {
      if (n <= 0 || !wanted.has(collection)) continue;
      week ??= weekStart(build.date);
      const row = byWeek.get(week) ?? {};
      row[collection] = (row[collection] ?? 0) + n;
      byWeek.set(week, row);
      seriesTotals.set(collection, (seriesTotals.get(collection) ?? 0) + n);
    }
  }
  if (byWeek.size === 0) return empty;

  const populated = [...byWeek.keys()].sort((a, b) => a.localeCompare(b));
  const first = populated[0];
  const last = populated.at(-1);
  if (!first || !last) return empty;

  // a continuous weekly axis reads as a real timeline (gaps = quiet weeks);
  // fall back to populated-only weeks when the span is pathologically wide
  const span =
    Math.round(
      (isoToUtc(last).getTime() - isoToUtc(first).getTime()) / WEEK_MS,
    ) + 1;
  const continuous = span <= MAX_CONTINUOUS_WEEKS;
  const weeks: string[] = [];
  if (continuous) {
    for (let w = first; w <= last; w = addWeeks(w, 1)) weeks.push(w);
  } else {
    weeks.push(...populated);
  }

  // largest contributor at the base of the stack, ties broken by name
  const series = [...seriesTotals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => ({
      name,
      label: collectionMeta(name).label,
      color: `${collectionMeta(name).color}.6`,
    }));

  const data = weeks.map((week) => {
    const counts = byWeek.get(week);
    const row: Record<string, number | string> = { week };
    for (const s of series) row[s.name] = counts?.[s.name] ?? 0;
    return row;
  });

  let totalChanges = 0;
  for (const total of seriesTotals.values()) totalChanges += total;

  return { data, series, totalChanges, continuous };
}
