import { cacheLife } from "next/cache";

import type {
  CostIndexGap,
  CostIndexHistory,
  CostIndexPoint,
  CostIndexRange,
  CostIndexValues,
  CostIndicesAt,
} from "./costIndices";
import { prisma } from "~/lib/db";
import { COST_INDEX_RANGE_DAYS, DAILY_COST_INDEX_RANGES } from "./costIndices";

/**
 * Snapshots further apart than this leave a gap: the job polls hourly, so
 * three hours tolerates a missed run or two without calling it one.
 */
const GAP_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface CostIndexRow {
  validFrom: Date;
  manufacturing: number | null;
  researchingTimeEfficiency: number | null;
  researchingMaterialEfficiency: number | null;
  copying: number | null;
  invention: number | null;
  reaction: number | null;
}

const VALUE_COLUMNS = {
  validFrom: true,
  manufacturing: true,
  researchingTimeEfficiency: true,
  researchingMaterialEfficiency: true,
  copying: true,
  invention: true,
  reaction: true,
} as const;

const toValues = (row: CostIndexRow): CostIndexValues => [
  row.manufacturing,
  row.researchingTimeEfficiency,
  row.researchingMaterialEfficiency,
  row.copying,
  row.invention,
  row.reaction,
];

const toPoint = (row: CostIndexRow): CostIndexPoint => ({
  time: row.validFrom.getTime(),
  values: toValues(row),
});

interface CostIndexCoverage {
  firstSnapshotAt: number | null;
  latestSnapshotAt: number | null;
  gaps: CostIndexGap[];
}

/**
 * When the record begins and ends, and where it has gaps: the same for every
 * system, so read once per hour for all of them. A database failure throws
 * (see apps/web/CLAUDE.md).
 */
export async function readCostIndexCoverage(): Promise<CostIndexCoverage> {
  "use cache";
  cacheLife("hours");

  const [first, latest, gaps] = await Promise.all([
    prisma.solarSystemCostIndexSnapshot.findFirst({
      select: { snapshotAt: true },
      orderBy: { snapshotAt: "asc" },
    }),
    prisma.solarSystemCostIndexSnapshot.findFirst({
      select: { snapshotAt: true },
      orderBy: { snapshotAt: "desc" },
    }),
    // A few tens of thousands of rows; no index serves the difference.
    prisma.$queryRaw<{ from: Date; to: Date }[]>`
      SELECT "previousSnapshotAt" AS "from", "snapshotAt" AS "to"
      FROM "SolarSystemCostIndexSnapshot"
      WHERE "snapshotAt" - "previousSnapshotAt" > ${`${GAP_MS / 1000} seconds`}::INTERVAL
      ORDER BY "snapshotAt"`,
  ]);
  return {
    firstSnapshotAt: first?.snapshotAt.getTime() ?? null,
    latestSnapshotAt: latest?.snapshotAt.getTime() ?? null,
    gaps: gaps.map((gap) => ({
      from: gap.from.getTime(),
      to: gap.to.getTime(),
    })),
  };
}

/**
 * Each day's last change since `from` (or ever): the value a system closed the
 * day on. A busy system changes most hours, so a year of every change would
 * be thousands of points.
 */
async function readDailyCloses(
  solarSystemId: number,
  from: Date | null,
): Promise<CostIndexRow[]> {
  // The day is computed once and named, in a subquery: Postgres would also
  // take the expression repeated, but CockroachDB (where this ran first) did
  // not match a repeated date_trunc() between DISTINCT ON and ORDER BY.
  return prisma.$queryRaw<CostIndexRow[]>`
    SELECT DISTINCT ON ("day")
      "validFrom", "manufacturing", "researchingTimeEfficiency",
      "researchingMaterialEfficiency", "copying", "invention", "reaction"
    FROM (
      SELECT date_trunc('day', "validFrom") AS "day", *
      FROM "SolarSystemCostIndex"
      WHERE "solarSystemId" = ${solarSystemId}
        AND "validFrom" > ${from ?? new Date(0)}
    ) AS c
    ORDER BY "day", "validFrom" DESC`;
}

/**
 * A solar system's cost index history over `range`, back from the latest
 * snapshot. Cached for an hour, as long as the job takes to add a snapshot. A
 * database failure throws (see apps/web/CLAUDE.md).
 */
export async function readSolarSystemCostIndexHistory(
  solarSystemId: number,
  range: CostIndexRange,
): Promise<CostIndexHistory> {
  "use cache";
  cacheLife("hours");

  const coverage = await readCostIndexCoverage();
  const resolution = DAILY_COST_INDEX_RANGES.has(range) ? "day" : "change";
  const days = COST_INDEX_RANGE_DAYS[range];
  const from =
    coverage.latestSnapshotAt === null || days === null
      ? null
      : coverage.latestSnapshotAt - days * DAY_MS;
  const history: CostIndexHistory = {
    range,
    resolution,
    firstSnapshotAt: coverage.firstSnapshotAt,
    latestSnapshotAt: coverage.latestSnapshotAt,
    from,
    points: [],
    gaps: coverage.gaps.filter((gap) => from === null || gap.to > from),
  };
  if (coverage.latestSnapshotAt === null) return history;

  // A range opening inside a gap opens where the gap ends: what was in force
  // before it is not known to have lasted through it.
  const pinnedAt =
    from === null
      ? null
      : (coverage.gaps.find((gap) => gap.from < from && from < gap.to)?.to ??
        from);
  const fromDate = pinnedAt === null ? null : new Date(pinnedAt);
  const [initial, rows] = await Promise.all([
    fromDate === null
      ? null
      : prisma.solarSystemCostIndex.findFirst({
          select: VALUE_COLUMNS,
          where: { solarSystemId, validFrom: { lte: fromDate } },
          orderBy: { validFrom: "desc" },
        }),
    resolution === "day"
      ? readDailyCloses(solarSystemId, fromDate)
      : prisma.solarSystemCostIndex.findMany({
          select: VALUE_COLUMNS,
          where: {
            solarSystemId,
            ...(fromDate === null ? {} : { validFrom: { gt: fromDate } }),
          },
          orderBy: { validFrom: "asc" },
        }),
  ]);

  history.points = [
    // What was in force when the range begins, pinned to its start.
    ...(initial && pinnedAt !== null
      ? [{ time: pinnedAt, values: toValues(initial) }]
      : []),
    ...rows.map(toPoint),
  ];
  return history;
}

/**
 * A solar system's indices at `at`: its latest change at or before then, and
 * whether a snapshot was taken close enough to vouch for it. Not cached: `at`
 * is any moment, and the route's CDN headers cache each answer.
 */
export async function readSolarSystemCostIndicesAt(
  solarSystemId: number,
  at: Date,
): Promise<CostIndicesAt> {
  const [row, observed, next] = await Promise.all([
    prisma.solarSystemCostIndex.findFirst({
      select: VALUE_COLUMNS,
      where: { solarSystemId, validFrom: { lte: at } },
      orderBy: { validFrom: "desc" },
    }),
    prisma.solarSystemCostIndexSnapshot.findFirst({
      select: { snapshotAt: true },
      where: { snapshotAt: { lte: at } },
      orderBy: { snapshotAt: "desc" },
    }),
    prisma.solarSystemCostIndexSnapshot.findFirst({
      select: { snapshotAt: true },
      where: { snapshotAt: { gt: at } },
      orderBy: { snapshotAt: "asc" },
    }),
  ]);
  const observedAt = observed?.snapshotAt.getTime() ?? null;
  const nextObservedAt = next?.snapshotAt.getTime() ?? null;
  // Past the latest snapshot, the values hold until the job's next one.
  const inGap =
    observedAt === null ||
    (nextObservedAt === null
      ? at.getTime() - observedAt > GAP_MS
      : nextObservedAt - observedAt > GAP_MS);
  const values = row ? toValues(row) : null;
  return {
    at: at.getTime(),
    values: values?.every((value) => value === null) ? null : values,
    since: row?.validFrom.getTime() ?? null,
    observedAt,
    nextObservedAt,
    inGap,
  };
}
