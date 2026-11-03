/**
 * The timeline of public contracts (firstSeenAt, lastSeenAt, endReason,
 * isDeleted), worked out from successive observations of ESI's per-region
 * listings. Pure: the `esi-sync-public-contracts` job feeds it the stored
 * state, the contracts the database holds as outstanding and this run's
 * listings, and writes what it returns. Kept free of ESI/Prisma runtime imports
 * so it can be unit-tested directly.
 *
 * The rules are the ones the EVE Ref snapshot ingest applied (contracts leave
 * the listing when accepted, completed, deleted or expired, and the public data
 * cannot tell the first three apart):
 *   - a region counts as complete in an observation only if its contract count
 *     is near its recent median; absences only count in complete regions;
 *   - a contract ends after MISSES_TO_END consecutive complete observations
 *     without it; endReason = RemovedBeforeExpiry if it vanished while its
 *     expiry was still ahead; Expired if it expired between last seen and first
 *     missed, unless those observations were more than GAP_MS apart (then NULL:
 *     it may have been accepted first);
 *   - a contract that reappears is reopened.
 * lastSeenAt is written when a contract ends, plus a daily checkpoint, not on
 * every run (about 50k outstanding contracts x 48 runs a day would be ~2.4M
 * updates a day).
 *
 * An observation is identified by its region listing's Last-Modified, which is
 * also the time it records: ESI regenerates each listing every 30 minutes, so a
 * retried or overlapping run that sees the same listing again changes nothing.
 * That is what keeps a retry from counting one absence twice.
 */

export const MISSES_TO_END = 2;
export const GAP_MS = 2 * 60 * 60 * 1000;
/** lastSeenAt is rewritten for every outstanding contract this often. */
export const CHECKPOINT_MS = 24 * 60 * 60 * 1000;
/** A region is complete if its count is at least 70% of its recent median. */
export const COMPLETE_FRACTION = 0.7;
/** Regions typically listing fewer contracts than this: complete when present. */
export const TINY_REGION = 20;
/** Observations of each region's count kept for the median. */
export const REGION_HISTORY_LENGTH = 20;

export type ContractEndReason = "Expired" | "RemovedBeforeExpiry";

/** A contract absent from its region's listing that has not ended yet. */
export interface MissingContract {
  /** Epoch ms of the last observation that listed it. */
  lastSeen: number;
  /** Epoch ms of the first observation that did not. */
  firstMissed: number;
  /** Consecutive complete observations without it. */
  missed: number;
}

export interface RegionState {
  /** Epoch ms Last-Modified of the last observation applied. */
  lastModified: number;
  /** Contract counts of the last observations, oldest first. */
  history: number[];
}

/**
 * What the job keeps between runs (in Redis). Everything else comes from the
 * database: the outstanding set is `Contract` where isDeleted = false.
 */
export interface TimelineState {
  regions: Record<string, RegionState>;
  missing: Record<string, MissingContract>;
  /** Epoch ms of the last lastSeenAt checkpoint; 0 if none was written. */
  lastCheckpointAt: number;
}

export const emptyTimelineState = (): TimelineState => ({
  regions: {},
  missing: {},
  lastCheckpointAt: 0,
});

/** An outstanding contract, as the database holds it. */
export interface OutstandingContract {
  contractId: number;
  regionId: number;
  /** Epoch ms. */
  dateExpired: number;
  /**
   * Epoch ms of the latest sighting the database records (lastSeenAt, which
   * is checkpointed daily, or firstSeenAt). Used when no observation of the
   * region is on record, e.g. on the first run after the snapshot ingest.
   */
  lastSeenAt: number;
}

/** One region's full listing (every page, one Last-Modified) from this run. */
export interface RegionObservation {
  regionId: number;
  /** Epoch ms Last-Modified of the listing. */
  observedAt: number;
  contractIds: ReadonlySet<number>;
}

export interface EndedContract {
  contractId: number;
  lastSeen: number;
  reason: ContractEndReason | null;
}

export interface TimelinePlan {
  state: TimelineState;
  /**
   * Contracts listed in an observation applied this run, with its time. Those
   * not outstanding are new (insert) or reappeared (reopen).
   */
  seen: Map<number, number>;
  ended: EndedContract[];
  /** lastSeenAt for every contract still outstanding, when one is due. */
  checkpoint: { contractId: number; lastSeen: number }[] | null;
  /** Regions whose listing had not changed since the last observation. */
  unchangedRegions: number[];
  /** Regions applied as incomplete: absences were not counted. */
  incompleteRegions: number[];
}

const median = (xs: number[]) => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/**
 * Whether a listing of `count` contracts is a complete one, given the region's
 * recent counts. A region is complete unless its count collapsed versus its
 * recent median (a failed listing). Counts are always recorded, so a genuine
 * decline is absorbed within a few observations instead of leaving the region
 * "incomplete" for good. Tiny regions swing too much to tell a failed listing
 * from noise: present = complete.
 */
export const isRegionComplete = (history: number[], count: number) => {
  const typical = median(history);
  return history.length < 5 || typical < TINY_REGION
    ? count > 0 || typical < 3
    : count >= COMPLETE_FRACTION * typical;
};

/**
 * Gone while its expiry was still ahead: removed before expiry, however long
 * the gap. Expiry fell between last seen and first missed: expired, unless that
 * window is so long it could equally have been accepted first (then unknown).
 */
export const endReasonOf = (
  dateExpired: number,
  { lastSeen, firstMissed }: Pick<MissingContract, "lastSeen" | "firstMissed">,
): ContractEndReason | null => {
  if (dateExpired > firstMissed) return "RemovedBeforeExpiry";
  return firstMissed - lastSeen <= GAP_MS ? "Expired" : null;
};

/**
 * One outstanding contract absent from a new observation of its region:
 * still missing (with one more miss if the listing was complete), or ended.
 */
const applyAbsence = (
  c: OutstandingContract,
  current: MissingContract | undefined,
  previousObservedAt: number | undefined,
  obs: RegionObservation,
  complete: boolean,
): { missing: MissingContract } | { ended: EndedContract } => {
  // Not listed: it was listed in the region's previous observation (or it
  // would be missing already), or, with none on record, when the database
  // last saw it.
  const m = current ?? {
    lastSeen: Math.max(previousObservedAt ?? 0, c.lastSeenAt),
    // When it went missing, even if this listing was partial.
    firstMissed: obs.observedAt,
    missed: 0,
  };
  // Partial listing: don't count toward ending.
  if (!complete) return { missing: m };
  const missed = m.missed + 1;
  if (missed < MISSES_TO_END) return { missing: { ...m, missed } };
  return {
    ended: {
      contractId: c.contractId,
      lastSeen: m.lastSeen,
      reason: endReasonOf(c.dateExpired, m),
    },
  };
};

/** lastSeen for every contract still outstanding after this run. */
const checkpointOf = (
  outstanding: readonly OutstandingContract[],
  ended: readonly EndedContract[],
  missing: TimelineState["missing"],
  regions: TimelineState["regions"],
) => {
  const endedIds = new Set(ended.map((e) => e.contractId));
  return outstanding
    .filter((c) => !endedIds.has(c.contractId))
    .map((c) => ({
      contractId: c.contractId,
      lastSeen: Math.max(
        c.lastSeenAt,
        missing[c.contractId]?.lastSeen ??
          regions[c.regionId]?.lastModified ??
          0,
      ),
    }));
};

/**
 * Seed region histories from the outstanding set, for regions with no history
 * on record (the first run). Without it, a region ESI listed as empty would
 * count as complete, and every contract in it as missing.
 */
export const seedRegionHistories = (
  state: TimelineState,
  outstanding: readonly OutstandingContract[],
): TimelineState => {
  const counts = new Map<number, number>();
  for (const c of outstanding)
    counts.set(c.regionId, (counts.get(c.regionId) ?? 0) + 1);
  const regions = { ...state.regions };
  for (const [regionId, count] of counts) {
    if (!Object.hasOwn(regions, regionId)) {
      regions[regionId] = { lastModified: 0, history: [count] };
    }
  }
  return { ...state, regions };
};

/** The plan's working state while observations are applied, in place. */
interface Working {
  regions: TimelineState["regions"];
  missing: TimelineState["missing"];
  seen: Map<number, number>;
  ended: EndedContract[];
  unchangedRegions: number[];
  incompleteRegions: number[];
}

/** Apply one region's observation to the working state. */
const applyObservation = (
  w: Working,
  obs: RegionObservation,
  inRegion: readonly OutstandingContract[],
) => {
  const previous = w.regions[obs.regionId];
  // The same listing again (a retry, an overlapping run), or an older copy
  // from another cache node: nothing new to learn from it.
  if (previous && obs.observedAt <= previous.lastModified) {
    w.unchangedRegions.push(obs.regionId);
    return;
  }
  const history = previous?.history ?? [];
  const count = obs.contractIds.size;
  const complete = isRegionComplete(history, count);
  if (!complete) w.incompleteRegions.push(obs.regionId);
  w.regions[obs.regionId] = {
    lastModified: obs.observedAt,
    history:
      count > 0 || history.length
        ? [...history.slice(-(REGION_HISTORY_LENGTH - 1)), count]
        : history,
  };
  for (const id of obs.contractIds) w.seen.set(id, obs.observedAt);

  for (const c of inRegion) {
    if (obs.contractIds.has(c.contractId)) {
      delete w.missing[c.contractId];
      continue;
    }
    const outcome = applyAbsence(
      c,
      w.missing[c.contractId],
      previous?.lastModified,
      obs,
      complete,
    );
    if ("missing" in outcome) {
      w.missing[c.contractId] = outcome.missing;
    } else {
      delete w.missing[c.contractId];
      w.ended.push(outcome.ended);
    }
  }
};

export const planContractTimeline = ({
  state,
  outstanding,
  observations,
  now,
}: {
  state: TimelineState;
  outstanding: readonly OutstandingContract[];
  observations: readonly RegionObservation[];
  /** Epoch ms; decides whether a checkpoint is due. */
  now: number;
}): TimelinePlan => {
  const w: Working = {
    regions: { ...state.regions },
    missing: { ...state.missing },
    seen: new Map(),
    ended: [],
    unchangedRegions: [],
    incompleteRegions: [],
  };
  const { regions, missing, seen, ended, unchangedRegions, incompleteRegions } =
    w;

  const byRegion = new Map<number, OutstandingContract[]>();
  for (const c of outstanding) {
    const list = byRegion.get(c.regionId);
    if (list) list.push(c);
    else byRegion.set(c.regionId, [c]);
  }
  for (const obs of observations) {
    applyObservation(w, obs, byRegion.get(obs.regionId) ?? []);
  }

  // Missing entries for contracts no longer outstanding (ended here or
  // elsewhere) are done with.
  const outstandingIds = new Set(outstanding.map((c) => c.contractId));
  for (const id of Object.keys(missing)) {
    if (!outstandingIds.has(Number(id))) delete missing[id];
  }

  const due = now - state.lastCheckpointAt >= CHECKPOINT_MS;
  const checkpoint = due
    ? checkpointOf(outstanding, ended, missing, regions)
    : null;

  return {
    state: {
      regions,
      missing,
      lastCheckpointAt: due ? now : state.lastCheckpointAt,
    },
    seen,
    ended,
    checkpoint,
    unchangedRegions,
    incompleteRegions,
  };
};
