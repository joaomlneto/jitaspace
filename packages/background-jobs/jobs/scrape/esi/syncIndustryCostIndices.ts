import { getIndustrySystems } from "@jitaspace/esi-client";

import type { JobLogger } from "../../../core";
import type { CostIndexSnapshotWrite } from "../../../helpers/costIndexStore.ts";
import type { CostIndexState } from "../../../helpers/industryCostIndices.ts";
import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import {
  appendCostIndexSnapshots,
  loadCostIndexState,
  loadLatestCostIndexSnapshot,
} from "../../../helpers/costIndexStore.ts";
import {
  fetchEveRefSnapshot,
  listEveRefSnapshotsBetween,
} from "../../../helpers/everefIndustrySystems.ts";
import {
  applyCostIndexRows,
  diffCostIndexStates,
  isPartialSnapshot,
  parseIndustrySystems,
} from "../../../helpers/industryCostIndices.ts";

/** A hung ESI request fails fast, so a retry runs before the next poll. */
const ESI_TIMEOUT_MS = 30_000;

/**
 * Behind by more than this, the job first replays the hours it missed from
 * EVE Ref's archive (a deploy gap, an outage, or the time between the
 * bootstrap and the first run). An hour and a half allows for ESI's
 * `Last-Modified` drifting against the schedule.
 */
const CATCH_UP_AFTER_MS = 90 * 60 * 1000;

/**
 * Archived snapshots replayed per run. A run that leaves some unread records
 * nothing from ESI, so the log stays in order; the next run continues. Three
 * days per run catches up a week's outage in a few hours.
 */
const MAX_CATCH_UP_SNAPSHOTS = 72;

/**
 * The snapshots EVE Ref archived after `after` and up to `until`, diffed in
 * order from `state`. Archived error pages and truncated responses are left
 * out. If EVE Ref fails, what was read up to the failure is returned and the
 * rest stays a gap: ESI's current values are worth more than a complete log.
 */
async function replayEveRef({
  after,
  until,
  state: initialState,
  logger,
}: {
  after: Date;
  until: Date;
  state: CostIndexState;
  logger: JobLogger;
}) {
  let state = initialState;
  const snapshots: CostIndexSnapshotWrite[] = [];
  try {
    const files = await listEveRefSnapshotsBetween({
      after,
      until,
      limit: MAX_CATCH_UP_SNAPSHOTS + 1,
    });
    for (const file of files.slice(0, MAX_CATCH_UP_SNAPSHOTS)) {
      const response = await fetchEveRefSnapshot(file.path); // NOSONAR: one at a time, EVE Ref rate-limits bursts
      const current = response && parseIndustrySystems(response).state;
      if (!current || isPartialSnapshot(state, current)) {
        logger.warn(
          "Skipped an archived snapshot that is not a full response",
          {
            path: file.path,
          },
        );
        continue;
      }
      const rows = diffCostIndexStates(state, current, file.time);
      snapshots.push({
        snapshotAt: file.time,
        source: "everef",
        sourceFile: file.path,
        systemCount: current.size,
        rows,
      });
      state = applyCostIndexRows(state, rows);
    }
    return { snapshots, state, behind: files.length > MAX_CATCH_UP_SNAPSHOTS };
  } catch (error) {
    logger.warn(
      "EVE Ref catch-up failed; recording ESI's values and leaving a gap",
      { error: error instanceof Error ? error.message : String(error) },
    );
    return { snapshots, state, behind: false };
  }
}

export interface SyncIndustryCostIndicesEventPayload {
  data: Record<string, never>;
}

const lastModifiedOf = (headers: unknown): Date | null => {
  const value =
    headers && typeof headers === "object"
      ? (headers as Record<string, unknown>)["last-modified"]
      : undefined;
  if (typeof value !== "string") return null;
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? null : time;
};

export const syncIndustryCostIndices = defineJob<
  SyncIndustryCostIndicesEventPayload["data"]
>({
  id: "esi-sync-industry-cost-indices",
  name: "Sync industry cost indices from ESI",
  // ESI caches GET /industry/systems for an hour (Last-Modified is :46 past
  // as of 2026-10), so polling more often sees nothing new. One request.
  trigger: { type: "cron", cron: "TZ=UTC 50 * * * *" },
  singleton: true,
  retries: 2,
  // A catch-up run downloads up to 72 archived snapshots, one a second.
  maxDurationSeconds: 900,
  description:
    "Record every solar system's industry cost indices from ESI, replaying missed hours from EVE Ref's archive",
  handler: async (ctx) => {
    const latest = await loadLatestCostIndexSnapshot(prisma);
    if (!latest) {
      // Starting the log here would leave no room for EVE Ref's history
      // before it: the bootstrap only appends after the latest snapshot.
      ctx.logger.warn(
        "No cost index history yet; run scripts/bootstrapIndustryCostIndices.ts first",
      );
      return { stats: { skipped: 1 } };
    }

    const esi = await getIndustrySystems(undefined, {
      signal: AbortSignal.timeout(ESI_TIMEOUT_MS),
    });
    const esiParsed = parseIndustrySystems(esi.data);
    const esiSnapshotAt = lastModifiedOf(esi.headers) ?? new Date();

    // Nothing new since the last run (ESI caches for an hour), and no gap to
    // replay: skip loading the state.
    if (esiSnapshotAt <= latest.snapshotAt) {
      return { stats: { unchanged: 1 } };
    }

    const knownSystems = await prisma.solarSystem.findMany({
      select: { solarSystemId: true },
    });
    let state: CostIndexState = await loadCostIndexState(prisma, [
      ...knownSystems.map((system) => system.solarSystemId),
      ...esiParsed.state.keys(),
    ]);
    let previousSnapshotAt = latest.snapshotAt;

    // Replay what EVE Ref archived since our latest snapshot, if we fell
    // behind.
    let catchUp: CostIndexSnapshotWrite[] = [];
    let behind = false;
    if (
      esiSnapshotAt.getTime() - previousSnapshotAt.getTime() >
      CATCH_UP_AFTER_MS
    ) {
      ({
        snapshots: catchUp,
        behind,
        state,
      } = await replayEveRef({
        after: previousSnapshotAt,
        until: esiSnapshotAt,
        state,
        logger: ctx.logger,
      }));
      if (catchUp.length > 0) {
        await appendCostIndexSnapshots(prisma, catchUp, previousSnapshotAt);
        previousSnapshotAt = catchUp.at(-1)?.snapshotAt ?? previousSnapshotAt;
      }
    }

    const catchUpStats = {
      replayed: catchUp.length,
      replayedRows: catchUp.reduce((sum, s) => sum + s.rows.length, 0),
    };
    if (behind) {
      return { stats: { ...catchUpStats, behind: 1 } };
    }

    // EVE Ref may already hold this response (it fetches at :42), or ESI may
    // not have refreshed since our last run.
    if (esiSnapshotAt <= previousSnapshotAt) {
      return { stats: { ...catchUpStats, unchanged: 1 } };
    }

    if (isPartialSnapshot(state, esiParsed.state)) {
      // Retried by the adapter; ESI is then likely to answer in full.
      throw new Error(
        `ESI listed ${esiParsed.state.size} systems, against ${state.size} stored`,
      );
    }
    if (Object.keys(esiParsed.unknownActivities).length > 0) {
      ctx.logger.warn("ESI listed activities with no column; not stored", {
        unknownActivities: esiParsed.unknownActivities,
      });
    }
    const rows = diffCostIndexStates(state, esiParsed.state, esiSnapshotAt);
    await appendCostIndexSnapshots(
      prisma,
      [
        {
          snapshotAt: esiSnapshotAt,
          source: "esi",
          sourceFile: null,
          systemCount: esiParsed.state.size,
          rows,
        },
      ],
      previousSnapshotAt,
    );

    return {
      stats: {
        ...catchUpStats,
        systems: esiParsed.state.size,
        changed: rows.length,
      },
    };
  },
});
