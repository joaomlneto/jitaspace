import type { SovereigntyObservation } from "../../../helpers/sovereigntyHistory.ts";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  fetchEveRefSnapshot,
  listEveRefDay,
  listEveRefSovereigntyArchive,
  readEveRefYearArchive,
} from "../../../helpers/everefSovereignty.ts";
import {
  commitSovereigntyHistory,
  loadSovereigntyHistory,
} from "../../../helpers/sovereigntyHistoryStore.ts";

/** Snapshots per transaction while replaying a yearly archive. */
const ARCHIVE_FLUSH_EVERY = 500;

const DEFAULT_BUDGET_MINUTES = 45;

export interface BackfillEveRefSovereigntyHistoryEventPayload {
  data: {
    /** Stop at snapshots after this (ISO 8601). Default: no limit. */
    until?: string;
    /**
     * Minutes of work per run. When it runs out the job saves its progress
     * and triggers itself to carry on, so a run never nears its time limit.
     * Default 45.
     */
    budgetMinutes?: number;
  };
}

/**
 * Builds SolarSystemSovereigntyPeriod from EVE Ref's archive of GET
 * /sovereignty/map, from where the history ends (or the archive's start,
 * 2017-11-29) up to its latest hourly file. Resumable: progress is committed
 * as it goes, and a re-run continues from the newest SovereigntySnapshot.
 *
 * Run it once before `esi-track-sovereignty` is deployed: that job records
 * nothing until a history exists, then fills any later gap from EVE Ref
 * itself. The whole archive is ~33k files plus ~300MB of yearly tarballs; at
 * the pace EVE Ref allows that takes several hours, over several chained runs.
 */
export const backfillEveRefSovereigntyHistory = defineJob<
  BackfillEveRefSovereigntyHistoryEventPayload["data"]
>({
  id: "backfill-everef-sovereignty-history",
  name: "Backfill sovereignty history from EVE Ref",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 3,
  maxDurationSeconds: 3600,
  // The 2018 archive is held compactly (~90MB) while its entries are sorted.
  machine: "medium-1x",
  description:
    "Replay EVE Ref's hourly sovereignty map archive (2017 onwards) into the sovereignty history, resuming from where it ends",
  handler: async (ctx) => {
    const until = ctx.payload.until ? new Date(ctx.payload.until) : null;
    const budgetMs =
      (ctx.payload.budgetMinutes ?? DEFAULT_BUDGET_MINUTES) * 60_000;
    const deadline = Date.now() + budgetMs;

    const history = await loadSovereigntyHistory(prisma);
    const startedFrom = history.latestSnapshotAt;
    const stats = { applied: 0, skipped: 0, archivedErrors: 0, commits: 0 };
    const inRange = (observedAt: Date) =>
      until === null || +observedAt <= +until;

    const apply = (snapshot: SovereigntyObservation | null) => {
      // EVE Ref archived an error response that hour, not a map.
      if (snapshot === null) {
        stats.archivedErrors++;
        return;
      }
      const result = history.apply(snapshot);
      if (result.applied) stats.applied++;
      else if (result.reason === "too-few-systems") {
        stats.skipped++;
        ctx.logger.warn("Skipped a snapshot listing too few systems", {
          observedAt: snapshot.observedAt,
          systems: snapshot.systems.size,
        });
      }
    };
    const commit = async () => {
      if (!history.hasChanges) return;
      await commitSovereigntyHistory(history);
      stats.commits++;
    };

    const parts = await listEveRefSovereigntyArchive(history.latestSnapshotAt);
    let finished = true;
    let reachedUntil = false;
    for (const part of parts) {
      if (Date.now() > deadline) {
        finished = false;
        break;
      }
      if (part.kind === "archive") {
        const { count, errors, observations } = await readEveRefYearArchive(
          part,
          history.latestSnapshotAt,
        );
        stats.archivedErrors += errors;
        ctx.logger.info(`Replaying the ${part.year} archive`, {
          snapshots: count,
          archivedErrors: errors,
        });
        let sinceCommit = 0;
        for (const snapshot of observations) {
          if (!inRange(snapshot.observedAt)) {
            reachedUntil = true;
            break;
          }
          apply(snapshot);
          if (++sinceCommit >= ARCHIVE_FLUSH_EVERY) {
            await commit(); // NOSONAR: in order, one at a time
            sinceCommit = 0;
          }
        }
      } else {
        const after = history.latestSnapshotAt;
        const files = (await listEveRefDay(part)).filter(
          (file) => after === null || +file.observedAt > +after,
        );
        for (const file of files) {
          if (!inRange(file.observedAt)) {
            reachedUntil = true;
            break;
          }
          apply(await fetchEveRefSnapshot(file)); // NOSONAR: one request at a time
        }
      }
      // One transaction per day, or per archive's tail.
      await commit(); // NOSONAR: in order, one at a time
      if (reachedUntil) break;
    }
    await commit();

    const result = {
      ...stats,
      startedFrom: startedFrom?.toISOString() ?? null,
      reached: history.latestSnapshotAt?.toISOString() ?? null,
      openPeriods: history.openPeriodCount,
      finished,
    };
    ctx.logger.info("Sovereignty history backfill run done", result);
    if (!finished) {
      await ctx.send("backfill-everef-sovereignty-history", ctx.payload);
    }
    return result;
  },
});
