/**
 * Database side of the SolarSystemCostIndex change log: loading the state the
 * log ends on, and appending snapshots after it. Shared by the hourly
 * `esi-sync-industry-cost-indices` job and the EVE Ref bootstrap script.
 */
import type { Db } from "@jitaspace/db";
import { Prisma } from "@jitaspace/db";

import type {
  CostIndexColumn,
  CostIndexState,
  SolarSystemCostIndexRow,
} from "./industryCostIndices.ts";
import { fromCostIndexRow } from "./industryCostIndices.ts";

type SolarSystemCostIndexSource = "esi" | "everef";

type LatestRow = { solarSystemId: number } & Record<
  CostIndexColumn,
  number | null
>;

/** Systems per state query: a few hundred `LIMIT 1` scans plan quickly. */
const STATE_QUERY_BATCH = 500;

/** A snapshot ready to append, with the rows it adds to the change log. */
export interface CostIndexSnapshotWrite {
  snapshotAt: Date;
  source: SolarSystemCostIndexSource;
  sourceFile: string | null;
  systemCount: number;
  rows: SolarSystemCostIndexRow[];
}

export async function loadLatestCostIndexSnapshot(prisma: Db) {
  return prisma.solarSystemCostIndexSnapshot.findFirst({
    orderBy: { snapshotAt: "desc" },
  });
}

/**
 * The latest change-log row of each of `solarSystemIds`, as the state a new
 * snapshot is diffed against. Systems whose latest row is all null (no longer
 * listed) or that have no row are left out.
 *
 * One reverse index scan of one row per system, rather than a read of the
 * whole log, so callers pass every system that could be in it: the systems a
 * new response lists, plus every system in the SolarSystem table (which
 * catches one that stopped being listed).
 *
 * Written as a UNION ALL of `ORDER BY … LIMIT 1` scans because both obvious
 * forms read every row of each system: CockroachDB decorrelates a LATERAL
 * `LIMIT 1` into a lookup join plus a sort, and has no loose index scan for
 * `DISTINCT ON` or `max()` per group (checked on v24.3).
 */
export async function loadCostIndexState(
  prisma: Db,
  solarSystemIds: Iterable<number>,
): Promise<CostIndexState> {
  const ids = [...new Set(solarSystemIds)];
  const state: CostIndexState = new Map();
  for (let start = 0; start < ids.length; start += STATE_QUERY_BATCH) {
    const branches = ids.slice(start, start + STATE_QUERY_BATCH).map(
      (id) => Prisma.sql`(
          SELECT "solarSystemId", "manufacturing", "researchingTimeEfficiency",
            "researchingMaterialEfficiency", "copying", "invention", "reaction"
          FROM "SolarSystemCostIndex"
          WHERE "solarSystemId" = ${id}
          ORDER BY "validFrom" DESC
          LIMIT 1
        )`,
    );
    const query = Prisma.join(branches, " UNION ALL ");
    const rows = await prisma.$queryRaw<LatestRow[]>(query); // NOSONAR: a few batches, one at a time
    for (const row of rows) {
      const values = fromCostIndexRow(row);
      if (values.some((value) => value !== null)) {
        state.set(Number(row.solarSystemId), values);
      }
    }
  }
  return state;
}

export class CostIndexSnapshotOrderError extends Error {}

/**
 * Appends snapshots, oldest first, with their change-log rows, in one
 * transaction. Refuses (throws `CostIndexSnapshotOrderError`) unless every one
 * is later than the latest snapshot already stored: the log after an earlier
 * insert would no longer hold, and another writer may have appended since the
 * caller loaded its state.
 */
export async function appendCostIndexSnapshots(
  prisma: Db,
  snapshots: readonly CostIndexSnapshotWrite[],
  expectedPreviousSnapshotAt: Date | null,
): Promise<void> {
  if (snapshots.length === 0) return;
  // Each snapshot's predecessor: the stored latest, then the one before it.
  const previousTimes = [
    expectedPreviousSnapshotAt,
    ...snapshots.map((snapshot) => snapshot.snapshotAt),
  ];
  if (
    snapshots.some((snapshot, index) => {
      const previous = previousTimes[index];
      return index > 0 && previous != null && snapshot.snapshotAt <= previous;
    })
  ) {
    throw new CostIndexSnapshotOrderError(
      "Snapshots must be appended oldest first",
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const latest = await tx.solarSystemCostIndexSnapshot.findFirst({
        select: { snapshotAt: true },
        orderBy: { snapshotAt: "desc" },
      });
      if (
        (latest?.snapshotAt.getTime() ?? null) !==
        (expectedPreviousSnapshotAt?.getTime() ?? null)
      ) {
        throw new CostIndexSnapshotOrderError(
          `Expected the latest snapshot to be ${expectedPreviousSnapshotAt?.toISOString() ?? "none"}, found ${latest?.snapshotAt.toISOString() ?? "none"}`,
        );
      }

      const rows = snapshots.flatMap((snapshot) => snapshot.rows);
      // One at a time: the transaction holds a single connection.
      for (let start = 0; start < rows.length; start += 5_000) {
        const batch = rows.slice(start, start + 5_000);
        await tx.solarSystemCostIndex.createMany({ data: batch }); // NOSONAR: one at a time, see above
      }
      await tx.solarSystemCostIndexSnapshot.createMany({
        data: snapshots.map((snapshot, index) => ({
          snapshotAt: snapshot.snapshotAt,
          previousSnapshotAt: previousTimes[index] ?? null,
          source: snapshot.source,
          sourceFile: snapshot.sourceFile,
          systemCount: snapshot.systemCount,
          changedSystemCount: snapshot.rows.length,
        })),
      });
    },
    // A day of bootstrap snapshots is tens of thousands of rows.
    { maxWait: 10_000, timeout: 120_000 },
  );
}
