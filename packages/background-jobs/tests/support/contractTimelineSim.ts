/**
 * Test support for the contract timeline:
 * - {@link MemoryTimeline}, an in-memory database that applies observations the
 *   way `contractTimelineStore.ts` does (same loading rules, same writes);
 * - {@link snapshotIngestOracle}, the EVE Ref snapshot ingest's own timeline
 *   algorithm (`ingest_contracts.mts`, applySnapshot), ported line for line, as
 *   the reference the engine must agree with;
 * - a seeded scenario generator, so property tests are reproducible.
 */
import type {
  ContractEndReason,
  LoggedObservation,
  StoredContract,
} from "../../helpers/contractTimeline";
import {
  applyRegionObservation,
  isRegionComplete,
  MISSES_TO_END,
  observationReach,
  REGION_HISTORY_LENGTH,
  seedLogOf,
} from "../../helpers/contractTimeline";

export interface Observation {
  regionId: number;
  observedAt: number;
  contractIds: number[];
}

type MemoryContract = StoredContract & { regionId: number };

/** What a contract's timeline amounts to, comparable across implementations. */
export interface Outcome {
  isDeleted: boolean;
  endReason: ContractEndReason | null;
  firstSeenAt: number | null;
  /** The latest observation listing it. */
  lastSeen: number;
  /** Missing from its region's latest observation (ended ones included). */
  missing: boolean;
}

export class MemoryTimeline {
  contracts = new Map<number, MemoryContract>();
  logs = new Map<number, LoggedObservation[]>();

  constructor(
    /** A contract's expiry as the listing at `observedAt` gives it. */
    private readonly expiryOf: (
      contractId: number,
      observedAt: number,
    ) => number,
    private readonly regionOf: (contractId: number) => number,
  ) {}

  /** A contract stored before the log existed (the snapshot ingest's). */
  preload(contractId: number, firstSeenAt: number, lastSeenAt: number) {
    this.contracts.set(contractId, {
      contractId,
      regionId: this.regionOf(contractId),
      dateExpired: this.expiryOf(contractId, firstSeenAt),
      firstSeenAt,
      lastSeenAt,
      isDeleted: false,
      endReason: null,
      absence: null,
    });
  }

  apply({ regionId, observedAt, contractIds }: Observation) {
    const inRegion = [...this.contracts.values()].filter(
      (c) => c.regionId === regionId,
    );
    const outstanding = inRegion.filter((c) => !c.isDeleted);
    let log = this.logs.get(regionId) ?? [];
    if (log.length === 0) log = seedLogOf(outstanding.length);
    const observation = {
      observedAt,
      contractIds: new Set(contractIds),
      dateExpired: new Map(
        contractIds.map((id) => [id, this.expiryOf(id, observedAt)]),
      ),
    };
    const reach = observationReach(log, observation);
    const stored = inRegion.filter(
      (c) =>
        !c.isDeleted ||
        observation.contractIds.has(c.contractId) ||
        (c.absence?.ended === true &&
          (reach.completenessChanged ||
            c.absence.lastSeenAt >= reach.endedSince)),
    );
    const fresh = [...observation.contractIds]
      .filter((id) => !this.contracts.has(id))
      .map((contractId) => ({
        contractId,
        dateExpired: this.expiryOf(contractId, observedAt),
      }));
    const result = applyRegionObservation({ log, observation, stored, fresh });
    this.logs.set(regionId, [
      ...log.filter((o) => o.isSeed || o.observedAt !== observedAt),
      { ...result.log, isSeed: false },
    ]);
    for (const id of result.restated) {
      const c = this.contracts.get(id);
      if (c) c.dateExpired = this.expiryOf(id, observedAt);
    }
    for (const { contractId, state } of result.inserts) {
      this.contracts.set(contractId, {
        contractId,
        regionId,
        dateExpired: this.expiryOf(contractId, observedAt),
        ...state,
      });
    }
    for (const { contractId, state } of result.updates) {
      const c = this.contracts.get(contractId);
      if (c) this.contracts.set(contractId, { ...c, ...state });
    }
    return result;
  }

  /** Each region's log, in time order. */
  sortedLogs() {
    return new Map(
      [...this.logs]
        .sort(([a], [b]) => a - b)
        .map(([r, log]) => [
          r,
          [...log].sort((x, y) => x.observedAt - y.observedAt),
        ]),
    );
  }

  latestOf(regionId: number) {
    const times = (this.logs.get(regionId) ?? [])
      .filter((o) => !o.isSeed)
      .map((o) => o.observedAt);
    return times.length ? Math.max(...times) : undefined;
  }

  /** The daily checkpoint: lastSeenAt of contracts listed in the latest. */
  checkpoint() {
    for (const c of this.contracts.values()) {
      const latest = this.latestOf(c.regionId);
      if (!c.isDeleted && !c.absence && latest !== undefined) {
        c.lastSeenAt = Math.max(c.lastSeenAt, latest);
      }
    }
  }

  /** Every contract's row, as the database would hold it. */
  rows() {
    return new Map(
      [...this.contracts]
        .sort(([a], [b]) => a - b)
        .map(([id, c]) => [id, { ...c }]),
    );
  }

  outcomes() {
    const out = new Map<number, Outcome>();
    for (const [id, c] of [...this.contracts].sort(([a], [b]) => a - b)) {
      out.set(id, {
        isDeleted: c.isDeleted,
        endReason: c.endReason,
        firstSeenAt: c.firstSeenAt,
        lastSeen:
          c.absence?.lastSeenAt ??
          (c.isDeleted
            ? c.lastSeenAt
            : (this.latestOf(c.regionId) ?? c.lastSeenAt)),
        missing: c.absence !== null,
      });
    }
    return out;
  }
}

const median = (xs: number[]) => {
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/**
 * The snapshot ingest's timeline, per region, observations taken in time order.
 * State is what its state.json held; the result is what it left in Contract.
 */
export const snapshotIngestOracle = (
  observations: readonly Observation[],
  expiryOf: (contractId: number, observedAt: number) => number,
) => {
  interface Outstanding {
    lastSeen: number;
    firstMissed: number | null;
    missed: number;
    regionId: number;
    expires: number;
  }
  const outstanding = new Map<number, Outstanding>();
  const regionHistory = new Map<number, number[]>();
  const stored = new Map<
    number,
    {
      /** contracts.csv's date_expired when first inserted (what it stored). */
      expires: number;
      firstSeen: number;
      isDeleted: boolean;
      endReason: ContractEndReason | null;
      lastSeen: number;
    }
  >();
  const byTime = [...observations].sort((a, b) => a.observedAt - b.observedAt);
  for (const { regionId, observedAt: t, contractIds } of byTime) {
    const seen = new Set(contractIds);
    const count = seen.size;
    const hist = regionHistory.get(regionId) ?? [];
    const typical = median(hist);
    let complete = false;
    if (count > 0 || hist.length) {
      // isRegionComplete is the ingest's expression, verbatim.
      complete =
        hist.length < 5 || typical < 20
          ? count > 0 || typical < 3
          : count >= 0.7 * typical;
      expectSame(complete, isRegionComplete(hist, count));
      regionHistory.set(regionId, [
        ...hist.slice(-(REGION_HISTORY_LENGTH - 1)),
        count,
      ]);
    }
    for (const id of seen) {
      if (outstanding.has(id)) continue;
      const s = stored.get(id);
      if (s)
        Object.assign(s, { isDeleted: false, endReason: null, lastSeen: t });
      else
        stored.set(id, {
          expires: expiryOf(id, t),
          firstSeen: t,
          isDeleted: false,
          endReason: null,
          lastSeen: t,
        });
      outstanding.set(id, {
        lastSeen: t,
        firstMissed: null,
        missed: 0,
        regionId,
        // The one deliberate difference: on a reopen the ingest judged the
        // next end against the reappearing listing's expiry, while the row
        // kept the first one. The engine uses the row's, so an auction's
        // reason (its expiry drifts per listing) follows from what is stored.
        expires: stored.get(id)!.expires,
      });
    }
    for (const [id, o] of outstanding) {
      if (o.regionId !== regionId) continue;
      if (seen.has(id)) {
        o.lastSeen = t;
        o.missed = 0;
        o.firstMissed = null;
        continue;
      }
      o.firstMissed ??= t;
      if (!complete) continue;
      o.missed += 1;
      if (o.missed < MISSES_TO_END) continue;
      const reason =
        o.expires > o.firstMissed
          ? "RemovedBeforeExpiry"
          : o.firstMissed - o.lastSeen <= 2 * 60 * 60 * 1000
            ? "Expired"
            : null;
      Object.assign(stored.get(id)!, {
        isDeleted: true,
        endReason: reason,
        lastSeen: o.lastSeen,
      });
      outstanding.delete(id);
    }
  }
  const out = new Map<number, Outcome>();
  for (const [id, s] of [...stored].sort(([a], [b]) => a - b)) {
    const o = outstanding.get(id);
    out.set(id, {
      isDeleted: s.isDeleted,
      endReason: s.endReason,
      firstSeenAt: s.firstSeen,
      lastSeen: o?.lastSeen ?? s.lastSeen,
      missing: o ? o.firstMissed !== null : true,
    });
  }
  return out;
};

function expectSame(a: boolean, b: boolean) {
  if (a !== b) throw new Error("isRegionComplete disagrees with the ingest");
}

/** mulberry32: a small, seeded PRNG. */
export const prng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const shuffle = <T>(xs: readonly T[], rnd: () => number) => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
};

const MIN = 60_000;
export const T0 = Date.UTC(2026, 10, 3, 12, 8, 12);

/**
 * A random history of one or two regions: contracts are born and die, drop out
 * of the odd listing, some listings are partial (a failed scrape), and the
 * listings come 30 minutes apart with the occasional gap of hours.
 */
export const scenario = (seed: number, { regions = [10000002] } = {}) => {
  const rnd = prng(seed);
  const count = 6 + Math.floor(rnd() * 12);
  const times: number[] = [];
  let t = T0;
  for (let i = 0; i < count; i++) {
    times.push(t);
    t += 30 * MIN * (rnd() < 0.15 ? 2 + Math.floor(rnd() * 8) : 1);
  }
  const expiry = new Map<number, number>();
  const region = new Map<number, number>();
  const life = new Map<number, { birth: number; death: number }>();
  const auctions = new Set<number>();
  let nextId = 1;
  for (const regionId of regions) {
    // Filler that is always listed, so completeness has a typical count.
    const filler = 5 + Math.floor(rnd() * 40);
    for (let i = 0; i < filler; i++) {
      const id = nextId++;
      region.set(id, regionId);
      expiry.set(id, T0 + 1000 * 24 * 60 * MIN);
      life.set(id, { birth: 0, death: count });
    }
    const tracked = 10 + Math.floor(rnd() * 25);
    for (let i = 0; i < tracked; i++) {
      const id = nextId++;
      const birth = Math.floor(rnd() * count);
      const death = birth + 1 + Math.floor(rnd() * (count - birth + 2));
      region.set(id, regionId);
      life.set(id, { birth, death });
      // Auctions: ESI gives the listing's time plus the whole days left.
      if (rnd() < 0.25) auctions.add(id);
      // Expiring anywhere from before it is first listed to well after.
      expiry.set(
        id,
        (times[birth] ?? T0) + (rnd() * (count - birth + 2) - 0.5) * 30 * MIN,
      );
    }
  }
  const observations: Observation[] = [];
  for (const regionId of regions) {
    times.forEach((observedAt, i) => {
      const partial = rnd() < 0.12;
      const contractIds = [...life]
        .filter(
          ([id, l]) =>
            region.get(id) === regionId &&
            l.birth <= i &&
            i < l.death &&
            rnd() > 0.05 &&
            (!partial || rnd() < 0.4),
        )
        .map(([id]) => id);
      // Each region refreshes at its own phase.
      observations.push({
        regionId,
        observedAt: observedAt + (regionId % 7) * 37_000,
        contractIds,
      });
    });
  }
  return {
    observations,
    expiryOf: (id: number, observedAt: number) => {
      const real = expiry.get(id) ?? T0;
      if (!auctions.has(id)) return real;
      const day = 24 * 60 * MIN;
      return observedAt + Math.ceil((real - observedAt) / day) * day;
    },
    regionOf: (id: number) => region.get(id) ?? regions[0]!,
  };
};
