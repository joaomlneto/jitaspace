import type { JobLogger } from "../../../core";
import type {
  EveRefDay,
  EveRefYearArchive,
} from "../../../helpers/everefSovereignty.ts";
import type {
  SovereigntyHistory,
  SovereigntyObservation,
} from "../../../helpers/sovereigntyHistory.ts";
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

/** Replays EVE Ref's archive into `history`, part by part, up to `until`. */
class Replay {
  readonly stats = { applied: 0, skipped: 0, archivedErrors: 0, commits: 0 };

  constructor(
    private readonly history: SovereigntyHistory,
    private readonly until: Date | null,
    private readonly logger: JobLogger,
  ) {}

  private inRange(observedAt: Date) {
    return this.until === null || +observedAt <= +this.until;
  }

  private apply(snapshot: SovereigntyObservation | null) {
    // EVE Ref archived an error response that hour, not a map.
    if (snapshot === null) {
      this.stats.archivedErrors++;
      return;
    }
    const result = this.history.apply(snapshot);
    if (result.applied) {
      this.stats.applied++;
    } else if (result.reason === "too-few-systems") {
      this.stats.skipped++;
      this.logger.warn("Skipped a snapshot listing too few systems", {
        observedAt: snapshot.observedAt,
        systems: snapshot.systems.size,
      });
    }
  }

  async commit() {
    if (!this.history.hasChanges) return;
    await commitSovereigntyHistory(this.history);
    this.stats.commits++;
  }

  /** Replays a yearly archive; true once past `until`. */
  async archive(part: EveRefYearArchive) {
    const { count, errors, observations } = await readEveRefYearArchive(
      part,
      this.history.latestSnapshotAt,
    );
    this.stats.archivedErrors += errors;
    this.logger.info(`Replaying the ${part.year} archive`, {
      snapshots: count,
      archivedErrors: errors,
    });
    let sinceCommit = 0;
    for (const snapshot of observations) {
      if (!this.inRange(snapshot.observedAt)) return true;
      this.apply(snapshot);
      if (++sinceCommit >= ARCHIVE_FLUSH_EVERY) {
        await this.commit(); // NOSONAR: in order, one at a time
        sinceCommit = 0;
      }
    }
    return false;
  }

  /** Replays a day's hourly files; true once past `until`. */
  async day(part: EveRefDay) {
    const after = this.history.latestSnapshotAt;
    const files = (await listEveRefDay(part)).filter(
      (file) => after === null || +file.observedAt > +after,
    );
    for (const file of files) {
      if (!this.inRange(file.observedAt)) return true;
      this.apply(await fetchEveRefSnapshot(file)); // NOSONAR: one request at a time
    }
    return false;
  }
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
    const replay = new Replay(history, until, ctx.logger);

    const parts = await listEveRefSovereigntyArchive(history.latestSnapshotAt);
    let finished = true;
    for (const part of parts) {
      if (Date.now() > deadline) {
        finished = false;
        break;
      }
      // In order, one part at a time: each continues from the last.
      const reachedUntil =
        part.kind === "archive"
          ? await replay.archive(part) // NOSONAR: in order, one at a time
          : await replay.day(part); // NOSONAR: in order, one at a time
      // One transaction per day, or per archive's tail.
      await replay.commit(); // NOSONAR: in order, one at a time
      if (reachedUntil) break;
    }
    await replay.commit();

    const result = {
      ...replay.stats,
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
