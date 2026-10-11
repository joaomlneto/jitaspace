import { getSovereigntySystems } from "@jitaspace/esi-client";

import type { JobLogger } from "../../../core";
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
  QUICK_EVEREF_REQUESTS,
} from "../../../helpers/everefSovereignty.ts";
import {
  holderFromEsi,
  isKSpaceSolarSystemId,
} from "../../../helpers/sovereigntyHistory.ts";
import {
  commitSovereigntyHistory,
  loadSovereigntyHistory,
} from "../../../helpers/sovereigntyHistoryStore.ts";
import { syncSovereignty } from "./syncSovereignty.ts";

/** A hung ESI request fails fast, so a retry runs before the next poll. */
const ESI_TIMEOUT_MS = 30_000;

/**
 * Longer than this since the last snapshot is a gap (a deploy, an outage,
 * failed runs), filled from EVE Ref's hourly archive before ESI's snapshot is
 * added. Shorter ones cannot hold an EVE Ref snapshot worth fetching.
 */
const GAP_MS = 15 * 60_000;

/**
 * EVE Ref files replayed per run: a day's worth, a couple of minutes at the
 * pace EVE Ref allows. A longer gap is caught up over the next runs, holding
 * ESI's snapshots back until then so the history stays in order.
 */
const MAX_GAP_FILL_FILES = 24;

/**
 * Time a run may spend filling a gap from EVE Ref. Each request fails fast
 * too (QUICK_EVEREF_REQUESTS): the job is a singleton, so a run stuck on a
 * slow EVE Ref would hold up every later run, and with them the current
 * holders' sync, which does not need EVE Ref at all.
 */
const GAP_FILL_BUDGET_MS = 2 * 60_000;

/**
 * A longer gap is left to `backfill-everef-sovereignty-history`, which may be
 * replaying it right now: two runs advancing one history would only make each
 * other's commits fail.
 */
const MAX_GAP_FILL_MS = 3 * 24 * 60 * 60_000;

/**
 * If EVE Ref cannot be read for this long after a gap opened, ESI's snapshot is
 * added anyway and the rest of the gap stays. Until then each run tries again.
 */
const GAP_FILL_PATIENCE_MS = 6 * 60 * 60_000;

/** `/api/revalidate/alliances` takes at most 5,000 ids per call. */
const REVALIDATION_BATCH_SIZE = 1000;

export interface TrackSovereigntyEventPayload {
  data: Record<string, never>;
}

/**
 * EVE Ref's hourly snapshots after the history's last one and before
 * `before`, at most MAX_GAP_FILL_FILES of them; `complete` is false if more
 * remain.
 */
async function eveRefSnapshotsInGap(after: Date, before: Date) {
  const parts = await listEveRefSovereigntyArchive(
    after,
    QUICK_EVEREF_REQUESTS,
  );
  const files: { observedAt: Date; url: string }[] = [];
  for (const part of parts) {
    if (part.kind !== "day" || +part.day >= +before) continue;
    const dayFiles = await listEveRefDay(part, QUICK_EVEREF_REQUESTS); // NOSONAR: one request at a time
    files.push(
      ...dayFiles.filter(
        (file) => +file.observedAt > +after && +file.observedAt < +before,
      ),
    );
    if (files.length > MAX_GAP_FILL_FILES) break;
  }
  return {
    files: files.slice(0, MAX_GAP_FILL_FILES),
    complete: files.length <= MAX_GAP_FILL_FILES,
  };
}

/**
 * Adds ESI's snapshot to the history, after replaying EVE Ref's snapshots of
 * any gap since the last one. Returns what it did, for the run's stats.
 */
async function recordHistory(
  history: SovereigntyHistory,
  esi: SovereigntyObservation,
  logger: JobLogger,
) {
  const latest = history.latestSnapshotAt;
  if (latest === null) {
    logger.warn(
      "No sovereignty history yet; run backfill-everef-sovereignty-history first. Not recording this snapshot, so the import can start from the beginning",
    );
    return { recorded: false, gapFilled: 0 };
  }

  let gapFilled = 0;
  let caughtUp = true;
  const gap = +esi.observedAt - +latest;
  if (gap > MAX_GAP_FILL_MS) {
    logger.warn(
      "The sovereignty history is days behind; run backfill-everef-sovereignty-history to catch up. Not recording this snapshot until then",
      { latestSnapshotAt: latest },
    );
    return { recorded: false, gapFilled: 0 };
  }
  if (gap > GAP_MS) {
    try {
      const { files, complete } = await eveRefSnapshotsInGap(
        latest,
        esi.observedAt,
      );
      const deadline = Date.now() + GAP_FILL_BUDGET_MS;
      let replayed = 0;
      for (const file of files) {
        if (Date.now() > deadline) break;
        const snapshot = await fetchEveRefSnapshot(file, QUICK_EVEREF_REQUESTS); // NOSONAR: one request at a time
        replayed++;
        if (snapshot && history.apply(snapshot).applied) gapFilled++;
      }
      // Out of time with files left: the next run carries on from here.
      caughtUp = complete && replayed === files.length;
    } catch (error) {
      // Keep what was replayed; within the patience window, hold ESI's
      // snapshot back so the next run can fill the rest of the gap.
      caughtUp = gap >= GAP_FILL_PATIENCE_MS;
      logger.warn(
        caughtUp
          ? "Could not fill the sovereignty gap from EVE Ref for hours; leaving it"
          : "Could not fill the sovereignty gap from EVE Ref; retrying next run",
        { latestSnapshotAt: history.latestSnapshotAt, error: String(error) },
      );
    }
  }

  const applied = caughtUp ? history.apply(esi) : undefined;
  if (applied && !applied.applied && applied.reason === "too-few-systems") {
    logger.warn("ESI listed too few systems; ignored it as a failed response", {
      systems: esi.systems.size,
      held: history.openPeriodCount,
    });
  }
  if (history.hasChanges) await commitSovereigntyHistory(history);
  return {
    recorded: applied?.applied ?? false,
    gapFilled,
    ...(caughtUp ? {} : { catchingUp: true }),
    opened: applied?.opened ?? 0,
    closed: applied?.closed ?? 0,
    refined: applied?.refined ?? 0,
  };
}

export const trackSovereignty = defineJob<TrackSovereigntyEventPayload["data"]>(
  {
    id: "esi-track-sovereignty",
    name: "Track sovereignty from ESI",
    // ESI caches GET /sovereignty/systems for 300s, so polling more often sees
    // nothing new. One request per run against the sovereignty group's 600 per
    // 15 minutes.
    trigger: { type: "cron", cron: "TZ=UTC */5 * * * *" },
    singleton: true,
    // The history is written in one transaction, so a retry starts clean.
    retries: 2,
    description:
      "Poll ESI's sovereignty of every K-space system: update the current holders and record each change of holder as history",
    handler: async (ctx) => {
      const response = await getSovereigntySystems(undefined, {
        signal: AbortSignal.timeout(ESI_TIMEOUT_MS),
      });
      const solarSystems = response.data.solar_systems;
      const lastModified = Date.parse(
        String(response.headers["last-modified"] ?? ""),
      );
      const esi: SovereigntyObservation = {
        // When ESI's data was current. A cached response seen twice has the
        // same time, and is recorded once.
        observedAt: new Date(
          Number.isNaN(lastModified) ? Date.now() : lastModified,
        ),
        source: "esi",
        systems: new Map(
          solarSystems
            .filter((system) => isKSpaceSolarSystemId(system.solar_system_id))
            .map((system) => [system.solar_system_id, holderFromEsi(system)]),
        ),
      };

      const current = await syncSovereignty({
        solarSystems,
        logger: ctx.logger,
      });

      // Evict before the history is written: a failure there must not lose
      // the evictions for the current holders, which are already written.
      const affected = current.affectedAllianceIds;
      await Promise.all(
        Array.from(
          { length: Math.ceil(affected.length / REVALIDATION_BATCH_SIZE) },
          (_, i) =>
            ctx.send("revalidate-alliance-cache", {
              allianceIds: affected.slice(
                i * REVALIDATION_BATCH_SIZE,
                (i + 1) * REVALIDATION_BATCH_SIZE,
              ),
            }),
        ),
      );

      const history = await recordHistory(
        await loadSovereigntyHistory(prisma),
        esi,
        ctx.logger,
      );

      const stats = {
        observedAt: esi.observedAt.toISOString(),
        current: current.stats,
        revalidated: affected.length,
        history,
      };
      ctx.logger.info("Sovereignty tracked", stats);
      return { stats };
    },
  },
);
