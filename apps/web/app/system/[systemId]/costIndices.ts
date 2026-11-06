/**
 * A solar system's industry cost index history, as `/api/system/[systemId]/
 * cost-indices` serves it, and the pure helpers that turn it into a chart
 * series. Shared by the route and the client page, so free of server imports.
 */

export const COST_INDEX_RANGES = ["7d", "30d", "90d", "1y", "all"] as const;
export type CostIndexRange = (typeof COST_INDEX_RANGES)[number];

export const isCostIndexRange = (value: unknown): value is CostIndexRange =>
  (COST_INDEX_RANGES as readonly unknown[]).includes(value);

/** Days back from the latest snapshot; null for the whole history. */
export const COST_INDEX_RANGE_DAYS: Record<CostIndexRange, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
  all: null,
};

/**
 * Ranges served one point per day (each day's last change) rather than every
 * change: a busy system changes most hours, which is ~9k points a year.
 */
export const DAILY_COST_INDEX_RANGES: ReadonlySet<CostIndexRange> = new Set([
  "1y",
  "all",
]);

/** The six activities, in the order of every `values` array. */
export const COST_INDEX_ACTIVITIES = [
  { key: "manufacturing", label: "Manufacturing" },
  { key: "researchingTimeEfficiency", label: "Time Efficiency Research" },
  {
    key: "researchingMaterialEfficiency",
    label: "Material Efficiency Research",
  },
  { key: "copying", label: "Copying" },
  { key: "invention", label: "Invention" },
  { key: "reaction", label: "Reactions" },
] as const;

export type CostIndexActivityKey =
  (typeof COST_INDEX_ACTIVITIES)[number]["key"];

/** One system's six indices; null where ESI did not list it. */
export type CostIndexValues = (number | null)[];

/** Values in force from `time` (epoch ms) until the next point. */
export interface CostIndexPoint {
  time: number;
  values: CostIndexValues;
}

/** A stretch with no snapshots: the values in it are unknown. */
export interface CostIndexGap {
  from: number;
  to: number;
}

export interface CostIndexHistory {
  range: CostIndexRange;
  resolution: "change" | "day";
  /** Epoch ms of the history's first and latest snapshots; null if none. */
  firstSnapshotAt: number | null;
  latestSnapshotAt: number | null;
  /** Start of the range; null for the whole history. */
  from: number | null;
  /**
   * The values in force at `from` (when known), then every change after it,
   * oldest first. With daily resolution, each day's last change.
   */
  points: CostIndexPoint[];
  /** Gaps in the record that overlap the range. */
  gaps: CostIndexGap[];
}

/** One system's indices at a moment, as the route's `?at=` answers. */
export interface CostIndicesAt {
  at: number;
  /** Null when nothing was recorded at or before `at`. */
  values: CostIndexValues | null;
  /** When those values were first recorded. */
  since: number | null;
  /** The snapshot at or before `at`, and the next one after it. */
  observedAt: number | null;
  nextObservedAt: number | null;
  /** True when `at` falls where no snapshot was taken. */
  inGap: boolean;
}

/** One chart row: the six indices (as fractions) at `time`. */
export type CostIndexChartRow = { time: number } & Record<
  CostIndexActivityKey,
  number | null
>;

const toRow = (time: number, values: CostIndexValues | null) => {
  const row = { time } as CostIndexChartRow;
  COST_INDEX_ACTIVITIES.forEach(({ key }, index) => {
    row[key] = values?.[index] ?? null;
  });
  return row;
};

/**
 * The step series a chart draws: a row at every change, a break (all null)
 * where each gap begins, the values carried forward where it ends, and a last
 * row at the latest snapshot so the steps reach the present.
 */
export function buildCostIndexChartRows(
  history: CostIndexHistory,
): CostIndexChartRow[] {
  const events: (
    | { time: number; kind: "point"; values: CostIndexValues }
    | { time: number; kind: "gapStart" | "gapEnd" }
  )[] = [
    ...history.points.map((point) => ({
      time: point.time,
      kind: "point" as const,
      values: point.values,
    })),
    ...history.gaps.flatMap((gap) => [
      { time: gap.from, kind: "gapStart" as const },
      { time: gap.to, kind: "gapEnd" as const },
    ]),
  ];
  // At equal times: a gap ends, then the change its first snapshot recorded;
  // the change recorded by the last snapshot before a gap, then the gap.
  const order = { gapEnd: 0, point: 1, gapStart: 2 };
  events.sort((a, b) => a.time - b.time || order[a.kind] - order[b.kind]);

  const rows: CostIndexChartRow[] = [];
  // A later row at the same time replaces the earlier one.
  const push = (time: number, values: CostIndexValues | null) => {
    if (rows.at(-1)?.time === time) rows.pop();
    rows.push(toRow(time, values));
  };
  let current: CostIndexValues | null = null;
  for (const event of events) {
    if (history.from !== null && event.time < history.from) continue;
    if (event.kind === "point") {
      current = event.values;
      push(event.time, current);
    } else if (event.kind === "gapStart") {
      // The last known values hold up to the last snapshot, then break.
      if (current) push(event.time, current);
      push(event.time + 1, null);
    } else if (current) {
      push(event.time, current);
    }
  }
  if (current && history.latestSnapshotAt !== null) {
    const last = rows.at(-1);
    if (!last || last.time < history.latestSnapshotAt) {
      push(history.latestSnapshotAt, current);
    }
  }
  return rows;
}
