/**
 * The timeline of public contracts (firstSeenAt, lastSeenAt, endReason,
 * isDeleted), worked out from observations of each region's public listing.
 * Pure: `contractTimelineStore.ts` loads what an observation can affect, calls
 * {@link applyRegionObservation} and writes what it returns. Kept free of
 * ESI/Prisma runtime imports so it can be unit-tested directly.
 *
 * The rules are the EVE Ref snapshot ingest's (contracts leave the listing when
 * accepted, completed, deleted or expired, and the public data cannot tell the
 * first three apart):
 *   - a region counts as complete in an observation only if its contract count
 *     is near its recent median; absences only count in complete regions;
 *   - a contract ends after MISSES_TO_END consecutive complete observations
 *     without it; endReason = RemovedBeforeExpiry if it vanished while its
 *     expiry was still ahead; Expired if it expired between last seen and first
 *     missed, unless those observations were more than GAP_MS apart (then NULL:
 *     it may have been accepted first);
 *   - a contract that reappears is reopened.
 *
 * **Any order, same result.** Two writers feed it: the ESI sync job, and the
 * EVE Ref snapshot ingest, which may lag behind, catch up on a gap, or run at
 * the same time. So the timeline is a function of the *set* of observations,
 * not of the order they arrive in:
 *   - an observation is keyed by (region, the listing's Last-Modified), which
 *     both sources know, so one listing read twice is one observation; the
 *     contracts it lists are the union of what each copy listed;
 *   - a contract's lastSeen is the latest observation listing it (a max), and
 *     firstSeen the earliest (a min);
 *   - every rule above is then read off the region's observation log after
 *     lastSeen: the misses are the complete observations after it (none of them
 *     lists it, or lastSeen would be later), firstMissed is the first
 *     observation after it, and completeness is judged against the observations
 *     before each one in time order.
 * Applying an observation twice changes nothing, and applying an older one
 * after newer ones gives what applying them in time order would have.
 *
 * Writes stay cheap: for a contract listed in its region's latest observation,
 * lastSeen is that observation, so it is not written per run (a daily
 * checkpoint copies it into Contract.lastSeenAt). Only contracts missing from
 * the latest observation carry an exact lastSeen, in ContractAbsence.
 */

export const MISSES_TO_END = 2;
export const GAP_MS = 2 * 60 * 60 * 1000;
/** A region is complete if its count is at least 70% of its recent median. */
export const COMPLETE_FRACTION = 0.7;
/** Regions typically listing fewer contracts than this: complete when present. */
export const TINY_REGION = 20;
/** Observations of each region's count the median looks back over. */
export const REGION_HISTORY_LENGTH = 20;

export type ContractEndReason = "Expired" | "RemovedBeforeExpiry";

/** One row of a region's observation log. Times are epoch ms. */
export interface LoggedObservation {
  observedAt: number;
  contractCount: number;
  /** A count from before the log existed: history for the median only. */
  isSeed: boolean;
}

/** A region's listing as one source read it. */
export interface RegionObservation {
  /** Epoch ms Last-Modified of the listing. */
  observedAt: number;
  contractIds: ReadonlySet<number>;
  /**
   * Each listed contract's expiry, as this listing gives it (epoch ms). ESI
   * recomputes an auction's from the listing's time and the whole days left,
   * so it drifts by 30 minutes per listing; the earliest listing's is kept.
   */
  dateExpired?: ReadonlyMap<number, number>;
}

/** Where a contract stands on its timeline. Times are epoch ms. */
export interface ContractTimelineState {
  firstSeenAt: number | null;
  /** Exact if ended or absent; otherwise a checkpoint at most the truth. */
  lastSeenAt: number;
  isDeleted: boolean;
  endReason: ContractEndReason | null;
  /** Missing from the region's latest observation since lastSeen. */
  absence: { lastSeenAt: number; ended: boolean } | null;
}

/** A stored contract the observation may affect. */
export interface StoredContract extends ContractTimelineState {
  contractId: number;
  /** Epoch ms. */
  dateExpired: number;
}

export interface ContractTimelineUpdate {
  contractId: number;
  state: ContractTimelineState;
}

export interface AppliedObservation {
  /** The log row to upsert (the count is the larger of the copies). */
  log: { observedAt: number; contractCount: number };
  /**
   * Stored contracts this observation is now the earliest listing of: their
   * row (expiry and all) becomes this listing's, as if it had come first.
   */
  restated: number[];
  /** Contracts first stored by this observation, with their timeline. */
  inserts: ContractTimelineUpdate[];
  /** Stored contracts whose timeline changes. */
  updates: ContractTimelineUpdate[];
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
  lastSeen: number,
  firstMissed: number,
): ContractEndReason | null => {
  if (dateExpired > firstMissed) return "RemovedBeforeExpiry";
  return firstMissed - lastSeen <= GAP_MS ? "Expired" : null;
};

/** Seeds first (they predate the log), then observations in time order. */
const byTime = (a: LoggedObservation, b: LoggedObservation) =>
  Number(b.isSeed) - Number(a.isSeed) || a.observedAt - b.observedAt;

/**
 * Whether each observation in the log was complete, judged against the counts
 * before it in time order (seeds included). Keyed by observedAt.
 */
export const completenessOf = (log: readonly LoggedObservation[]) => {
  const complete = new Map<number, boolean>();
  const history: number[] = [];
  for (const o of [...log].sort(byTime)) {
    if (!o.isSeed) {
      // The ingest never judged a region it had yet to see listing anything.
      const judged = o.contractCount > 0 || history.length > 0;
      complete.set(
        o.observedAt,
        judged &&
          isRegionComplete(
            history.slice(-REGION_HISTORY_LENGTH),
            o.contractCount,
          ),
      );
    }
    // The ingest only started a region's history once it listed something.
    if (o.contractCount > 0 || history.length) history.push(o.contractCount);
  }
  return complete;
};

/** The log with this observation in it; a second copy keeps the larger count. */
const withObservation = (
  log: readonly LoggedObservation[],
  observedAt: number,
  count: number,
) => {
  const existing = log.find((o) => !o.isSeed && o.observedAt === observedAt);
  const contractCount = Math.max(existing?.contractCount ?? 0, count);
  return {
    contractCount,
    log: [
      ...log.filter((o) => o !== existing),
      { observedAt, contractCount, isSeed: false },
    ],
  };
};

/** The latest observation (not seed) before `before`, if any. */
const latestObservationOf = (
  log: readonly LoggedObservation[],
  before = Number.POSITIVE_INFINITY,
) => {
  let latest: number | undefined;
  for (const o of log) {
    if (
      !o.isSeed &&
      o.observedAt < before &&
      (latest === undefined || o.observedAt > latest)
    ) {
      latest = o.observedAt;
    }
  }
  return latest;
};

/**
 * What an observation needs loaded besides the region's outstanding contracts
 * and the ended contracts it lists: the ended contracts it can correct. One
 * last seen before the latest observation preceding it already has a first
 * miss earlier than it, so it can't change, unless the observation changes
 * whether some later observation was complete; then every absence of the
 * region must be read.
 */
export const observationReach = (
  log: readonly LoggedObservation[],
  observation: RegionObservation,
) => {
  const before = completenessOf(log);
  const after = completenessOf(
    withObservation(log, observation.observedAt, observation.contractIds.size)
      .log,
  );
  return {
    /** Read every absence of the region, not just the recent ones. */
    completenessChanged: [...before].some(
      ([t, complete]) => after.get(t) !== complete,
    ),
    /** Otherwise, ended absences last seen at or after this suffice. */
    endedSince:
      latestObservationOf(log, observation.observedAt) ??
      Number.NEGATIVE_INFINITY,
  };
};

/**
 * The observations of a log in time order, with a running count of the
 * complete ones, so "after lastSeen" questions take a binary search.
 */
const indexOf = (log: readonly LoggedObservation[]) => {
  const complete = completenessOf(log);
  const times = log
    .filter((o) => !o.isSeed)
    .map((o) => o.observedAt)
    .sort((a, b) => a - b);
  /** completeBefore[i]: complete observations among times[0..i-1]. */
  const completeBefore = [0];
  for (const t of times) {
    completeBefore.push(
      (completeBefore.at(-1) ?? 0) + (complete.get(t) ? 1 : 0),
    );
  }
  return {
    /** First observation after `lastSeen`, and complete ones after it. */
    after: (lastSeen: number) => {
      let lo = 0;
      let hi = times.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if ((times[mid] ?? 0) <= lastSeen) lo = mid + 1;
        else hi = mid;
      }
      return {
        firstMissed: times[lo],
        misses: (completeBefore.at(-1) ?? 0) - (completeBefore[lo] ?? 0),
      };
    },
  };
};

type LogIndex = ReturnType<typeof indexOf>;

/**
 * Where a contract last seen at `lastSeen` stands: ended after MISSES_TO_END
 * complete observations after lastSeen, missing after any, listed in the
 * region's latest observation otherwise.
 */
const resolve = (
  lastSeen: number,
  dateExpired: number,
  firstSeenAt: number | null,
  index: LogIndex,
): ContractTimelineState => {
  const { firstMissed, misses } = index.after(lastSeen);
  if (firstMissed === undefined) {
    return {
      firstSeenAt,
      lastSeenAt: lastSeen,
      isDeleted: false,
      endReason: null,
      absence: null,
    };
  }
  const ended = misses >= MISSES_TO_END;
  return {
    firstSeenAt,
    lastSeenAt: lastSeen,
    isDeleted: ended,
    endReason: ended ? endReasonOf(dateExpired, lastSeen, firstMissed) : null,
    absence: { lastSeenAt: lastSeen, ended },
  };
};

const sameState = (a: ContractTimelineState, b: ContractTimelineState) =>
  a.firstSeenAt === b.firstSeenAt &&
  a.lastSeenAt === b.lastSeenAt &&
  a.isDeleted === b.isDeleted &&
  a.endReason === b.endReason &&
  a.absence?.lastSeenAt === b.absence?.lastSeenAt &&
  a.absence?.ended === b.absence?.ended;

const earliest = (a: number | null, b: number) =>
  a === null ? b : Math.min(a, b);

/** How the observation relates to one stored contract. */
interface Context {
  observedAt: number;
  dateExpired: ReadonlyMap<number, number> | undefined;
  /** The region's latest observation before this one. */
  latestBefore: number | undefined;
  completenessChanged: boolean;
  index: LogIndex;
}

/**
 * Where one stored contract stands after the observation, or null if the
 * observation cannot change it.
 */
const nextStateOf = (
  stored: StoredContract,
  listed: boolean,
  {
    observedAt,
    dateExpired,
    latestBefore,
    completenessChanged,
    index,
  }: Context,
): ContractTimelineState | null => {
  const firstSeenAt = listed
    ? earliest(stored.firstSeenAt, observedAt)
    : stored.firstSeenAt;
  // The earliest listing's row is the one kept, expiry included.
  const c =
    firstSeenAt === stored.firstSeenAt
      ? stored
      : {
          ...stored,
          dateExpired:
            dateExpired?.get(stored.contractId) ?? stored.dateExpired,
        };
  const exactLastSeen =
    c.absence?.lastSeenAt ?? (c.isDeleted ? c.lastSeenAt : undefined);
  if (exactLastSeen === undefined) {
    // Outstanding and listed in the region's latest observation (or, with no
    // observation on record, last seen when the database says). Only a newer
    // observation that leaves it out moves it.
    const isNewest = latestBefore === undefined || observedAt > latestBefore;
    if (listed || !isNewest) {
      return firstSeenAt === c.firstSeenAt ? null : { ...c, firstSeenAt };
    }
    const lastSeen = Math.max(latestBefore ?? 0, c.lastSeenAt);
    return resolve(lastSeen, c.dateExpired, firstSeenAt, index);
  }
  if (listed) {
    const lastSeen = Math.max(exactLastSeen, observedAt);
    return resolve(lastSeen, c.dateExpired, firstSeenAt, index);
  }
  // Ended before the log existed: what came after is unknown, so leave it.
  if (!c.absence) return null;
  if (exactLastSeen >= observedAt && !completenessChanged) return null;
  return resolve(exactLastSeen, c.dateExpired, firstSeenAt, index);
};

/**
 * Apply one observation of a region. `stored` must hold every outstanding
 * contract of the region, the stored contracts the observation lists, and the
 * region's ended absences within {@link observationReach}; `fresh` the
 * contracts it lists that are not stored at all.
 */
export const applyRegionObservation = ({
  log,
  observation,
  stored,
  fresh,
}: {
  log: readonly LoggedObservation[];
  observation: RegionObservation;
  stored: readonly StoredContract[];
  fresh: readonly { contractId: number; dateExpired: number }[];
}): AppliedObservation => {
  const { observedAt, contractIds } = observation;
  const next = withObservation(log, observedAt, contractIds.size);
  const context: Context = {
    observedAt,
    dateExpired: observation.dateExpired,
    latestBefore: latestObservationOf(log),
    completenessChanged: observationReach(log, observation).completenessChanged,
    index: indexOf(next.log),
  };

  const updates: ContractTimelineUpdate[] = [];
  const restated: number[] = [];
  for (const c of stored) {
    const listed = contractIds.has(c.contractId);
    if (listed && (c.firstSeenAt === null || observedAt < c.firstSeenAt)) {
      restated.push(c.contractId);
    }
    const state = nextStateOf(c, listed, context);
    if (state && !sameState(state, c)) {
      updates.push({ contractId: c.contractId, state });
    }
  }
  const inserts = fresh.map((c) => ({
    contractId: c.contractId,
    state: resolve(observedAt, c.dateExpired, observedAt, context.index),
  }));
  return {
    log: { observedAt, contractCount: next.contractCount },
    restated,
    inserts,
    updates,
  };
};

/**
 * The seed for a region's empty log: the number of contracts the database
 * holds as outstanding there, so a first observation listing none can't count
 * as complete and end them all.
 */
export const seedLogOf = (outstandingCount: number): LoggedObservation[] =>
  outstandingCount > 0
    ? [{ observedAt: 0, contractCount: outstandingCount, isSeed: true }]
    : [];
