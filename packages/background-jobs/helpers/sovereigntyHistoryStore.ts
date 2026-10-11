import type { Prisma } from "@jitaspace/db";

import type {
  SovereigntyHistoryChanges,
  SovereigntyPeriod,
} from "./sovereigntyHistory.ts";
import { prisma } from "../db";
import { SovereigntyHistory } from "./sovereigntyHistory.ts";

type Db = Prisma.TransactionClient;

/** Rows per statement: keeps each well under the bind-parameter limit. */
const CHUNK_SIZE = 500;

const chunks = <T>(items: T[]) =>
  Array.from({ length: Math.ceil(items.length / CHUNK_SIZE) }, (_, i) =>
    items.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
  );

const periodColumns = {
  solarSystemId: true,
  startedAt: true,
  earliestStartedAt: true,
  endedAt: true,
  isUnclaimed: true,
  allianceId: true,
  corporationId: true,
  factionId: true,
  claimedSince: true,
  sovereigntyHubId: true,
} as const;

/** The history as stored: every open period, and the newest snapshot. */
export async function loadSovereigntyHistory(db: Db = prisma) {
  const openPeriods: SovereigntyPeriod[] =
    await db.solarSystemSovereigntyPeriod.findMany({
      select: periodColumns,
      where: { endedAt: null },
    });
  const latest = await db.sovereigntySnapshot.findFirst({
    select: { observedAt: true, source: true },
    orderBy: { observedAt: "desc" },
  });
  return new SovereigntyHistory({
    openPeriods,
    latestSnapshotAt: latest?.observedAt ?? null,
    latestSnapshotSource: latest?.source ?? null,
  });
}

/**
 * Writes one flush of SovereigntyHistory. Run it in a transaction: the
 * snapshots are the cursor the next run resumes from, so they must land
 * together with the periods they produced. Rows are rewritten (deleted, then
 * inserted) rather than updated, so a flush is a handful of statements however
 * many rows it touches; the first poll after an EVE Ref import fills in the
 * claim time of every alliance-held system.
 */
export async function writeSovereigntyHistory(
  db: Db,
  { snapshots, deletes, upserts, retargets }: SovereigntyHistoryChanges,
) {
  // Stored rows whose end follows a successor's refined start: read them,
  // and rewrite them with the new end alongside the rest.
  const retargeted: SovereigntyPeriod[] = [];
  for (const batch of chunks(retargets)) {
    const rows = await db.solarSystemSovereigntyPeriod.findMany({
      select: periodColumns,
      where: {
        OR: batch.map(({ solarSystemId, endedAt }) => ({
          solarSystemId,
          endedAt,
        })),
      },
    });
    const newEnd = new Map(
      batch.map((r) => [`${r.solarSystemId}:${+r.endedAt}`, r.newEndedAt]),
    );
    for (const row of rows) {
      const endedAt = newEnd.get(`${row.solarSystemId}:${Number(row.endedAt)}`);
      if (endedAt) retargeted.push({ ...row, endedAt });
    }
  }

  const toDelete = [
    ...deletes,
    ...retargeted.map(({ solarSystemId, startedAt }) => ({
      solarSystemId,
      startedAt,
    })),
  ];
  // One statement at a time: a transaction holds a single connection.
  for (const batch of chunks(toDelete)) {
    await db.solarSystemSovereigntyPeriod.deleteMany({
      where: { OR: batch },
    }); // NOSONAR: one at a time, see above
  }
  for (const batch of chunks([...upserts, ...retargeted])) {
    await db.solarSystemSovereigntyPeriod.createMany({ data: batch }); // NOSONAR: one at a time, see above
  }
  for (const batch of chunks(snapshots)) {
    await db.sovereigntySnapshot.createMany({ data: batch }); // NOSONAR: one at a time, see above
  }
  return {
    snapshots: snapshots.length,
    periodsWritten: upserts.length + retargeted.length,
  };
}

/**
 * Writes what `history` has applied since it was loaded or last committed, in
 * one transaction. Refuses if the database's newest snapshot is no longer the
 * one `history` started from: another run (the import and the poll) wrote in
 * between, and the in-memory periods are stale.
 */
export async function commitSovereigntyHistory(history: SovereigntyHistory) {
  const expected = history.committedSnapshotAt;
  const changes = history.flush();
  return prisma.$transaction(
    async (tx) => {
      const latest = await tx.sovereigntySnapshot.findFirst({
        select: { observedAt: true },
        orderBy: { observedAt: "desc" },
      });
      if (
        (latest?.observedAt.getTime() ?? null) !== (expected?.getTime() ?? null)
      ) {
        throw new Error(
          `Sovereignty history moved on while this run built on it (expected its newest snapshot at ${expected?.toISOString() ?? "none"}, found ${latest?.observedAt.toISOString() ?? "none"}); not writing`,
        );
      }
      return writeSovereigntyHistory(tx, changes);
    },
    {
      // The check above only holds under SERIALIZABLE: under READ COMMITTED
      // (Postgres' default) two overlapping runs could both pass it and write
      // two versions of the same periods. One of them now fails instead.
      isolationLevel: "Serializable",
      maxWait: 10_000,
      // The first flush of an import writes every K-space system at once.
      timeout: 120_000,
    },
  );
}
