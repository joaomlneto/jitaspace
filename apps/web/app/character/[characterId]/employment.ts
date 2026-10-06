/** One ESI corporation-history record, as the page needs it. */
export interface EmploymentRecord {
  record_id: number;
  corporation_id: number;
  start_date: string;
  is_deleted?: boolean;
}

/** A stint in one corporation, newest first, ending where the next began. */
export interface Stint {
  recordId: number;
  corporationId: number;
  start: string;
  /** Null for the current corporation. */
  end: string | null;
  isCurrent: boolean;
  isClosed: boolean;
  /** Length in days, measured to `now` for the current stint. */
  days: number;
}

export interface EmploymentSummary {
  stints: number;
  /** Distinct corporations, counting a return as one. */
  corporations: number;
  current: Stint | null;
  longest: Stint | null;
  averageDays: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Orders a character's corporation history newest first and measures each
 * stint. ESI's `record_id` increases with each move, so it orders reliably
 * even where two records share a start date.
 */
export function toStints(
  history: readonly EmploymentRecord[],
  now: string | null,
): Stint[] {
  const sorted = [...history].sort((a, b) => b.record_id - a.record_id);
  return sorted.map((record, index) => {
    const end = index === 0 ? null : (sorted[index - 1]?.start_date ?? null);
    const until = end ?? now;
    return {
      recordId: record.record_id,
      corporationId: record.corporation_id,
      start: record.start_date,
      end,
      isCurrent: index === 0,
      isClosed: record.is_deleted === true,
      days:
        until === null
          ? 0
          : Math.max(
              0,
              (Date.parse(until) - Date.parse(record.start_date)) / DAY_MS,
            ),
    };
  });
}

/** Counts and the notable stints, for the overview and the history tab. */
export function summarizeEmployment(
  stints: readonly Stint[],
): EmploymentSummary {
  const longest = stints.reduce<Stint | null>(
    (best, stint) => (best === null || stint.days > best.days ? stint : best),
    null,
  );
  return {
    stints: stints.length,
    corporations: new Set(stints.map((stint) => stint.corporationId)).size,
    current: stints.find((stint) => stint.isCurrent) ?? null,
    longest,
    averageDays:
      stints.length > 0
        ? stints.reduce((sum, stint) => sum + stint.days, 0) / stints.length
        : null,
  };
}

/** "3 years", "4 months", "12 days": the largest whole unit. */
export function formatDays(days: number): string {
  const unit = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;
  if (days >= 365) return unit(Math.floor(days / 365), "year");
  if (days >= 30) return unit(Math.floor(days / 30), "month");
  return unit(Math.floor(days), "day");
}
