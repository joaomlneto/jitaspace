/**
 * Builds SolarSystemSovereigntyPeriod from a stream of whole-map sovereignty
 * snapshots (ours from ESI, or EVE Ref's archive), oldest first. Shared by the
 * `backfill-everef-sovereignty-history` import and the `esi-track-sovereignty`
 * poll, so both write the same history. Kept free of ESI/Prisma runtime imports
 * so it can be unit-tested directly.
 */
import type { SovereigntySystemsSolarsystem } from "@jitaspace/esi-client";

/** Who holds one system's sovereignty, as one snapshot reports it. */
export interface SovereigntyHolder {
  isUnclaimed: boolean;
  allianceId: number | null;
  corporationId: number | null;
  factionId: number | null;
  /** Only GET /sovereignty/systems reports these; null from /sovereignty/map. */
  claimedSince: Date | null;
  sovereigntyHubId: bigint | null;
}

/** A SolarSystemSovereigntyPeriod row, minus its timestamp. */
export interface SovereigntyPeriod extends SovereigntyHolder {
  solarSystemId: number;
  startedAt: Date;
  earliestStartedAt: Date | null;
  endedAt: Date | null;
}

export type SovereigntySnapshotSource = "esi" | "everef";

/** One snapshot of the whole map, K-space systems only. */
export interface SovereigntyObservation {
  observedAt: Date;
  source: SovereigntySnapshotSource;
  systems: Map<number, SovereigntyHolder>;
}

/** K-space system ids are 30xxxxxx; wormholes (31…), Abyssal and the rest sit above. */
export const isKSpaceSolarSystemId = (solarSystemId: number) =>
  solarSystemId >= 30_000_000 && solarSystemId < 31_000_000;

/**
 * How much older than its `observedAt` a snapshot's data can be. Ours carry
 * ESI's Last-Modified, so none. EVE Ref's carry the time EVE Ref fetched GET
 * /sovereignty/map, which ESI caches for an hour: a claim ESI dates at 01:00
 * was still missing from the file EVE Ref fetched at 01:40.
 */
export const SNAPSHOT_STALENESS_MS: Record<SovereigntySnapshotSource, number> =
  {
    esi: 0,
    everef: 60 * 60_000,
  };

/**
 * A snapshot that lists fewer than this share of the systems held now is taken
 * for a failed response, not for systems dropping out of the map: from 2017 to
 * 2026 no snapshot listed fewer K-space systems than the one before
 * (5,431 growing to 5,485), while a partial one would close and reopen every
 * system it missed.
 */
export const MIN_LISTED_SHARE = 0.95;

const UNCLAIMED: SovereigntyHolder = {
  isUnclaimed: true,
  allianceId: null,
  corporationId: null,
  factionId: null,
  claimedSince: null,
  sovereigntyHubId: null,
};

/** One system from ESI's GET /sovereignty/systems. */
export const holderFromEsi = (
  system: SovereigntySystemsSolarsystem,
): SovereigntyHolder => {
  const { claim } = system;
  const alliance = "alliance" in claim ? claim.alliance : undefined;
  const faction = "faction" in claim ? claim.faction : undefined;
  if (alliance) {
    return {
      isUnclaimed: false,
      allianceId: alliance.alliance_id,
      corporationId: alliance.corporation_id,
      factionId: null,
      claimedSince: new Date(alliance.claimed_since),
      sovereigntyHubId: BigInt(alliance.sovereignty_hub.id),
    };
  }
  if (faction) {
    return { ...UNCLAIMED, isUnclaimed: false, factionId: faction.faction_id };
  }
  return UNCLAIMED;
};

/** One entry of GET /sovereignty/map, the format EVE Ref archives. */
export interface SovereigntyMapEntry {
  system_id: number;
  alliance_id?: number;
  corporation_id?: number;
  faction_id?: number;
}

/**
 * GET /sovereignty/map lists a K-space system with no holder as just its id,
 * which GET /sovereignty/systems reports as unclaimed: the two agreed on every
 * one of the 5,485 K-space systems when compared on 2026-10-10.
 */
export const holderFromMap = (
  entry: SovereigntyMapEntry,
): SovereigntyHolder => {
  if (entry.alliance_id !== undefined) {
    return {
      ...UNCLAIMED,
      isUnclaimed: false,
      allianceId: entry.alliance_id,
      corporationId: entry.corporation_id ?? null,
    };
  }
  if (entry.faction_id !== undefined) {
    return { ...UNCLAIMED, isUnclaimed: false, factionId: entry.faction_id };
  }
  return UNCLAIMED;
};

/** The K-space systems of a /sovereignty/map response, as an observation. */
export const observationFromMap = (
  entries: SovereigntyMapEntry[],
  observedAt: Date,
  source: SovereigntySnapshotSource,
): SovereigntyObservation => ({
  observedAt,
  source,
  systems: new Map(
    entries
      .filter((entry) => isKSpaceSolarSystemId(entry.system_id))
      .map((entry) => [entry.system_id, holderFromMap(entry)]),
  ),
});

const sameHolder = (a: SovereigntyHolder, b: SovereigntyHolder) =>
  a.isUnclaimed === b.isUnclaimed &&
  a.allianceId === b.allianceId &&
  a.corporationId === b.corporationId &&
  a.factionId === b.factionId;

const differs = <T>(a: T | null, b: T | null, eq: (x: T, y: T) => boolean) =>
  a !== null && b !== null && !eq(a, b);

/** The same claim, as far as both sides know: only a known difference splits it. */
const sameClaim = (period: SovereigntyHolder, seen: SovereigntyHolder) =>
  sameHolder(period, seen) &&
  !differs(period.claimedSince, seen.claimedSince, (x, y) => +x === +y) &&
  !differs(period.sovereigntyHubId, seen.sovereigntyHubId, (x, y) => x === y);

const holderOf = (period: SovereigntyHolder): SovereigntyHolder => ({
  isUnclaimed: period.isUnclaimed,
  allianceId: period.allianceId,
  corporationId: period.corporationId,
  factionId: period.factionId,
  claimedSince: period.claimedSince,
  sovereigntyHubId: period.sovereigntyHubId,
});

const periodKey = (solarSystemId: number, startedAt: Date) =>
  `${solarSystemId}:${startedAt.getTime()}`;

/** A stored row whose `endedAt` must move: a successor's start was refined. */
export interface PeriodEndRetarget {
  solarSystemId: number;
  endedAt: Date;
  newEndedAt: Date;
}

/** Everything to write for the observations applied since the last flush. */
export interface SovereigntyHistoryChanges {
  snapshots: {
    observedAt: Date;
    source: SovereigntySnapshotSource;
    systemCount: number;
  }[];
  /** Stored rows to delete, by key: each is either rewritten in `upserts` or retired. */
  deletes: { solarSystemId: number; startedAt: Date }[];
  /** Rows to write (new, or replacing a deleted one). */
  upserts: SovereigntyPeriod[];
  /** Stored closed rows, not loaded, whose end moves to a successor's refined start. */
  retargets: PeriodEndRetarget[];
}

export interface ApplyResult {
  applied: boolean;
  /** Why it was not, if it was not. */
  reason?: "not-newer" | "older-data" | "too-few-systems";
  opened: number;
  closed: number;
  refined: number;
}

/**
 * The history as of the latest snapshot, in memory: the open period of every
 * system, plus what changed since the last `flush()`. Load it with the stored
 * open periods and the latest snapshot's time, apply snapshots oldest first,
 * then write `flush()`'s changes in one transaction.
 */
export class SovereigntyHistory {
  /** Each system's current period. */
  private readonly open = new Map<number, SovereigntyPeriod>();
  /** Keys of rows that are in the database as they were loaded or last flushed. */
  private readonly stored = new Set<string>();
  /** Rows changed or created since the last flush, by key. */
  private readonly dirty = new Map<string, SovereigntyPeriod>();
  /** Stored rows whose key changed (a refined start): delete the old key. */
  private readonly deleted = new Map<
    string,
    { solarSystemId: number; startedAt: Date }
  >();
  private retargets: PeriodEndRetarget[] = [];
  private snapshots: SovereigntyHistoryChanges["snapshots"] = [];
  private latest: Date | null;
  private latestSource: SovereigntySnapshotSource | null;
  /** The newest snapshot in the database, as of the last load or flush. */
  private committed: Date | null;

  constructor({
    openPeriods,
    latestSnapshotAt,
    latestSnapshotSource = null,
  }: {
    /** Every stored period with no `endedAt`. */
    openPeriods: SovereigntyPeriod[];
    /** The newest SovereigntySnapshot, or null if there are none. */
    latestSnapshotAt: Date | null;
    latestSnapshotSource?: SovereigntySnapshotSource | null;
  }) {
    for (const period of openPeriods) {
      this.open.set(period.solarSystemId, { ...period });
      this.stored.add(periodKey(period.solarSystemId, period.startedAt));
    }
    this.latest = latestSnapshotAt;
    this.latestSource = latestSnapshotSource;
    this.committed = latestSnapshotAt;
  }

  /** The newest snapshot applied or loaded. */
  get latestSnapshotAt() {
    return this.latest;
  }

  /** The newest snapshot the database had when this was loaded or last flushed. */
  get committedSnapshotAt() {
    return this.committed;
  }

  get openPeriodCount() {
    return this.open.size;
  }

  private touch(period: SovereigntyPeriod) {
    this.dirty.set(periodKey(period.solarSystemId, period.startedAt), period);
  }

  /** Moves a period's start; the stored row under the old key goes. */
  private moveStart(period: SovereigntyPeriod, startedAt: Date) {
    const oldKey = periodKey(period.solarSystemId, period.startedAt);
    this.dirty.delete(oldKey);
    if (this.stored.has(oldKey)) {
      this.stored.delete(oldKey);
      this.deleted.set(oldKey, {
        solarSystemId: period.solarSystemId,
        startedAt: period.startedAt,
      });
    }
    period.startedAt = startedAt;
    period.earliestStartedAt = startedAt;
    this.touch(period);
  }

  private close(period: SovereigntyPeriod, endedAt: Date) {
    period.endedAt = endedAt;
    this.touch(period);
    this.open.delete(period.solarSystemId);
  }

  /**
   * Where a new claim starts: at its `claimedSince` when that falls after the
   * previous snapshot (so after the previous holder was last seen) and no
   * later than this one; otherwise at this snapshot.
   *
   * After an EVE Ref snapshot, whose data can be an hour old, a claim from
   * that hour is left at this snapshot rather than placed before the previous
   * holder's last sighting: the previous period may itself have begun then.
   */
  private startOf(seen: SovereigntyHolder, observedAt: Date) {
    const claimed = seen.claimedSince;
    const exact =
      claimed !== null &&
      +claimed <= +observedAt &&
      (this.latest === null || +claimed > +this.latest);
    return exact
      ? { startedAt: claimed, earliestStartedAt: claimed }
      : { startedAt: observedAt, earliestStartedAt: this.latest };
  }

  /**
   * ESI reports a claim time or hub for a period that had none (it began in
   * EVE Ref's data, which lacks both). Fills them in, and when the claim time
   * narrows down when the period began, moves its start there.
   *
   * Returns false when the claim began after the period did: the same
   * alliance and corporation lost the system and claimed it again unseen, so
   * it is a new claim.
   */
  private fillClaim(period: SovereigntyPeriod, seen: SovereigntyHolder) {
    const claimed = seen.claimedSince;
    if (period.claimedSince === null && claimed !== null) {
      if (+claimed > +period.startedAt) return false;
      const earliest = period.earliestStartedAt;
      // Equal to the start already, or before the previous holder was last
      // seen (a claim time that survived a change of holding corporation, or
      // one inside the hour an EVE Ref snapshot can lag by): the start stays
      // put, so it can never cross the previous period's.
      if (
        +claimed < +period.startedAt &&
        (earliest === null || +claimed > +earliest)
      ) {
        const previousStart = period.startedAt;
        this.moveStart(period, claimed);
        this.retargets.push({
          solarSystemId: period.solarSystemId,
          endedAt: previousStart,
          newEndedAt: claimed,
        });
      }
      period.claimedSince = claimed;
    }
    if (period.sovereigntyHubId === null && seen.sovereigntyHubId !== null) {
      period.sovereigntyHubId = seen.sovereigntyHubId;
    }
    this.touch(period);
    return true;
  }

  apply(observation: SovereigntyObservation): ApplyResult {
    const { observedAt, systems } = observation;
    const result: ApplyResult = {
      applied: false,
      opened: 0,
      closed: 0,
      refined: 0,
    };
    if (this.latest !== null && +observedAt <= +this.latest) {
      return { ...result, reason: "not-newer" };
    }
    // An EVE Ref file fetched soon after one of our polls may hold data from
    // before it, and would undo a change the poll already recorded.
    const staleness = SNAPSHOT_STALENESS_MS[observation.source];
    if (
      this.latest !== null &&
      staleness > SNAPSHOT_STALENESS_MS[this.latestSource ?? "esi"] &&
      +observedAt - staleness < +this.latest
    ) {
      return { ...result, reason: "older-data" };
    }
    const stillListed = [...this.open.keys()].filter((id) =>
      systems.has(id),
    ).length;
    if (this.open.size > 0 && stillListed < this.open.size * MIN_LISTED_SHARE) {
      return { ...result, reason: "too-few-systems" };
    }

    for (const [solarSystemId, seen] of systems) {
      const current = this.open.get(solarSystemId);
      if (current && sameClaim(current, seen)) {
        const needsFill =
          (current.claimedSince === null && seen.claimedSince !== null) ||
          (current.sovereigntyHubId === null && seen.sovereigntyHubId !== null);
        if (!needsFill) continue;
        const before = +current.startedAt;
        if (this.fillClaim(current, seen)) {
          if (+current.startedAt !== before) result.refined++;
          continue;
        }
        // The same holder claimed it again since: the old claim ends there.
        const claimedAt = seen.claimedSince ?? observedAt;
        const startedAt = +claimedAt > +observedAt ? observedAt : claimedAt;
        this.close(current, startedAt);
        this.openPeriod(solarSystemId, seen, {
          startedAt,
          earliestStartedAt: startedAt,
        });
        result.closed++;
        result.opened++;
        continue;
      }
      const start = this.startOf(seen, observedAt);
      if (current) {
        this.close(current, start.startedAt);
        result.closed++;
      }
      this.openPeriod(solarSystemId, seen, start);
      result.opened++;
    }

    // Systems no longer listed: their holder's period ends here.
    for (const [solarSystemId, period] of this.open) {
      if (!systems.has(solarSystemId)) {
        this.close(period, observedAt);
        result.closed++;
      }
    }

    this.latest = observedAt;
    this.latestSource = observation.source;
    this.snapshots.push({
      observedAt,
      source: observation.source,
      systemCount: systems.size,
    });
    return { ...result, applied: true };
  }

  private openPeriod(
    solarSystemId: number,
    seen: SovereigntyHolder,
    start: { startedAt: Date; earliestStartedAt: Date | null },
  ) {
    const period: SovereigntyPeriod = {
      solarSystemId,
      ...holderOf(seen),
      ...start,
      endedAt: null,
    };
    this.open.set(solarSystemId, period);
    this.touch(period);
  }

  /** Whether anything is waiting to be written. */
  get hasChanges() {
    return (
      this.snapshots.length > 0 || this.dirty.size > 0 || this.deleted.size > 0
    );
  }

  /**
   * What to write since the last flush, then forgets it (the caller writes it
   * before applying more). A dirty row that is already stored is rewritten:
   * deleted and inserted again, which batches where per-row updates would not.
   */
  flush(): SovereigntyHistoryChanges {
    const upserts = [...this.dirty.values()].map((period) => ({ ...period }));
    const deletes = [
      ...this.deleted.values(),
      ...upserts
        .filter((period) =>
          this.stored.has(periodKey(period.solarSystemId, period.startedAt)),
        )
        .map(({ solarSystemId, startedAt }) => ({ solarSystemId, startedAt })),
    ];
    // A retarget of a row this batch wrote anyway is already in `upserts`.
    const written = new Map(
      upserts
        .filter((period) => period.endedAt !== null)
        .map((period) => [
          `${period.solarSystemId}:${period.endedAt?.getTime()}`,
          period,
        ]),
    );
    const retargets: PeriodEndRetarget[] = [];
    for (const retarget of this.retargets) {
      const own = written.get(
        `${retarget.solarSystemId}:${retarget.endedAt.getTime()}`,
      );
      if (own) own.endedAt = retarget.newEndedAt;
      else retargets.push(retarget);
    }
    const changes = { snapshots: this.snapshots, deletes, upserts, retargets };

    // What was written is now stored; closed periods are no longer tracked.
    for (const period of this.dirty.values()) {
      const key = periodKey(period.solarSystemId, period.startedAt);
      if (period.endedAt === null) this.stored.add(key);
      else this.stored.delete(key);
    }
    this.dirty.clear();
    this.deleted.clear();
    this.retargets = [];
    this.snapshots = [];
    this.committed = this.latest;
    return changes;
  }
}
