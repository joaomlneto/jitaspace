import { describe, expect, it } from "@jest/globals";

import type { Observation } from "./support/contractTimelineSim";
import {
  completenessOf,
  endReasonOf,
  GAP_MS,
  isRegionComplete,
} from "../helpers/contractTimeline";
import {
  MemoryTimeline,
  prng,
  scenario,
  shuffle,
  snapshotIngestOracle,
  T0,
} from "./support/contractTimelineSim";

const MIN = 60_000;
const HOUR = 60 * MIN;
const REGION = 10000002;
/** The listing generation `n` half-hours after T0. */
const at = (n: number) => T0 + n * 30 * MIN;
/** Contracts always listed, so a listing of the region counts as complete. */
const FILLER = Array.from({ length: 100 }, (_, i) => 1_000_000 + i);
const listing = (n: number, ids: number[], filler = FILLER): Observation => ({
  regionId: REGION,
  observedAt: at(n),
  contractIds: [...ids, ...filler],
});
/** A region whose last ten listings held ~100 contracts. */
const steadyHistory = () =>
  Array.from({ length: 10 }, (_, i) => listing(i - 10, []));

const timeline = (expiries: Record<number, number> = {}) =>
  new MemoryTimeline(
    (id) => expiries[id] ?? at(1000),
    () => REGION,
  );
const run = (expiries: Record<number, number>, observations: Observation[]) => {
  const t = timeline(expiries);
  for (const o of observations) t.apply(o);
  return t;
};

describe("isRegionComplete", () => {
  it("treats a collapse below 70% of the median as incomplete", () => {
    const history = Array(10).fill(1000);
    expect(isRegionComplete(history, 700)).toBe(true);
    expect(isRegionComplete(history, 699)).toBe(false);
    expect(isRegionComplete(history, 0)).toBe(false);
  });

  it("treats tiny regions as complete when present", () => {
    expect(isRegionComplete(Array(10).fill(10), 1)).toBe(true);
    expect(isRegionComplete(Array(10).fill(10), 0)).toBe(false);
    // So small that an empty listing is plausible.
    expect(isRegionComplete(Array(10).fill(2), 0)).toBe(true);
  });

  it("is lenient while the history is short", () => {
    expect(isRegionComplete([35000], 10)).toBe(true);
    expect(isRegionComplete([35000], 0)).toBe(false);
  });
});

describe("completenessOf", () => {
  it("judges each observation against those before it in time, whatever order they are given in", () => {
    const log = [
      ...Array.from({ length: 6 }, (_, i) => ({
        observedAt: at(i),
        contractCount: 100,
        isSeed: false,
      })),
      { observedAt: at(6), contractCount: 50, isSeed: false },
    ];
    const forward = completenessOf(log);
    expect(forward.get(at(6))).toBe(false);
    expect(completenessOf([...log].reverse())).toEqual(forward);
  });

  it("never judges a region before it has listed anything", () => {
    expect(
      completenessOf([{ observedAt: at(0), contractCount: 0, isSeed: false }]),
    ).toEqual(new Map([[at(0), false]]));
  });

  it("counts seeds as history, not as observations", () => {
    const complete = completenessOf([
      { observedAt: 0, contractCount: 35000, isSeed: true },
      { observedAt: at(0), contractCount: 0, isSeed: false },
    ]);
    expect(complete).toEqual(new Map([[at(0), false]]));
  });
});

describe("endReasonOf", () => {
  it("is RemovedBeforeExpiry when it vanished before expiring, however long the gap", () => {
    expect(endReasonOf(at(10), at(0), at(5))).toBe("RemovedBeforeExpiry");
  });

  it("is Expired when it expired between last seen and first missed", () => {
    expect(endReasonOf(at(1), at(0), at(2))).toBe("Expired");
  });

  it("is unknown when that window is longer than GAP_MS", () => {
    expect(endReasonOf(at(1), at(0), at(0) + GAP_MS + 1)).toBeNull();
    expect(endReasonOf(at(1), at(0), at(0) + GAP_MS)).toBe("Expired");
  });
});

describe("one contract's timeline", () => {
  it("is first seen in the first listing that lists it", () => {
    const t = run({}, [...steadyHistory(), listing(0, [42])]);
    expect(t.outcomes().get(42)).toEqual({
      isDeleted: false,
      endReason: null,
      firstSeenAt: at(0),
      lastSeen: at(0),
      missing: false,
    });
  });

  it("is missing, not ended, after one complete listing without it", () => {
    const t = run({}, [...steadyHistory(), listing(0, [42]), listing(1, [])]);
    expect(t.outcomes().get(42)).toMatchObject({
      isDeleted: false,
      lastSeen: at(0),
      missing: true,
    });
  });

  it("ends after two complete listings without it", () => {
    const t = run({}, [
      ...steadyHistory(),
      listing(0, [42]),
      listing(1, []),
      listing(2, []),
    ]);
    expect(t.outcomes().get(42)).toMatchObject({
      isDeleted: true,
      endReason: "RemovedBeforeExpiry",
      lastSeen: at(0),
    });
  });

  it("does not count listings of an incomplete region", () => {
    const partial = FILLER.slice(0, 10);
    const t = run({}, [
      ...steadyHistory(),
      listing(0, [42]),
      listing(1, [], partial),
      listing(2, [], partial),
      listing(3, [], partial),
    ]);
    expect(t.outcomes().get(42)).toMatchObject({
      isDeleted: false,
      lastSeen: at(0),
      missing: true,
    });
    // The first complete listing after it is only its first miss.
    t.apply(listing(4, []));
    expect(t.outcomes().get(42)?.isDeleted).toBe(false);
    t.apply(listing(5, []));
    expect(t.outcomes().get(42)?.isDeleted).toBe(true);
  });

  it("starts over when it is listed again", () => {
    const t = run({}, [
      ...steadyHistory(),
      listing(0, [42]),
      listing(1, []),
      listing(2, [42]),
      listing(3, []),
    ]);
    expect(t.outcomes().get(42)).toMatchObject({
      isDeleted: false,
      lastSeen: at(2),
      missing: true,
    });
  });

  it("is reopened when listed again after it ended", () => {
    const t = run({}, [
      ...steadyHistory(),
      listing(0, [42]),
      listing(1, []),
      listing(2, []),
      listing(3, [42]),
    ]);
    expect(t.outcomes().get(42)).toEqual({
      isDeleted: false,
      endReason: null,
      firstSeenAt: at(0),
      lastSeen: at(3),
      missing: false,
    });
  });

  it("marks expiry within a short gap as Expired", () => {
    const t = run({ 42: at(0) + 10 * MIN }, [
      ...steadyHistory(),
      listing(0, [42]),
      listing(1, []),
      listing(2, []),
    ]);
    expect(t.outcomes().get(42)?.endReason).toBe("Expired");
  });

  it("leaves expiry across a long gap unknown", () => {
    // Last listed at T0, expired an hour later; nothing listed for 5 hours.
    const t = run({ 42: at(0) + HOUR }, [
      ...steadyHistory(),
      listing(0, [42]),
      listing(10, []),
      listing(11, []),
    ]);
    expect(t.outcomes().get(42)).toMatchObject({
      isDeleted: true,
      endReason: null,
    });
  });
});

describe("sources that overlap, repeat or arrive late", () => {
  it("records one listing read by two sources once", () => {
    const t = run({}, [...steadyHistory(), listing(0, [42])]);
    t.apply(listing(1, []));
    // The same listing again (the other source, or a retry).
    const again = t.apply(listing(1, []));
    expect(again.updates).toEqual([]);
    expect(again.inserts).toEqual([]);
    expect(t.outcomes().get(42)).toMatchObject({ isDeleted: false });
  });

  it("takes the union of two copies of one listing, one of them partial", () => {
    const t = run({}, [...steadyHistory(), listing(0, [42, 43])]);
    // A partial copy that lost 42, then the full copy.
    t.apply(listing(1, [43], FILLER.slice(0, 90)));
    t.apply(listing(1, [42, 43]));
    t.apply(listing(2, [42, 43]));
    expect(t.outcomes().get(42)).toMatchObject({
      isDeleted: false,
      lastSeen: at(2),
      missing: false,
    });
  });

  it("applies an older listing that arrives late as if it had come in order", () => {
    const observations = [
      ...steadyHistory(),
      listing(0, [42]),
      listing(1, [42]),
      listing(2, []),
      listing(3, []),
    ];
    const inOrder = run({}, observations);
    // The ESI job saw 0, 2 and 3; the snapshot ingest delivers 1 later.
    const late = run(
      {},
      observations.filter((o) => o.observedAt !== at(1)),
    );
    expect(late.outcomes().get(42)?.lastSeen).toBe(at(0));
    late.apply(listing(1, [42]));
    expect(late.outcomes()).toEqual(inOrder.outcomes());
    expect(inOrder.outcomes().get(42)?.lastSeen).toBe(at(1));
  });

  it("corrects an ended contract's reason when a late listing moves its first miss", () => {
    // Expires 10 minutes after T0. Listings at 0, then nothing until 6 and 7:
    // a 3h window, so the reason is unknown.
    const expiries = { 42: at(0) + 10 * MIN };
    const t = run(expiries, [
      ...steadyHistory(),
      listing(0, [42]),
      listing(6, []),
      listing(7, []),
    ]);
    expect(t.outcomes().get(42)?.endReason).toBeNull();
    // A snapshot from 30 minutes after T0 turns up: it was missing by then.
    t.apply(listing(1, []));
    expect(t.outcomes().get(42)).toMatchObject({
      isDeleted: true,
      endReason: "Expired",
    });
  });

  it("re-judges completeness when a late listing changes a region's history", () => {
    // Four listings of ~20 contracts, then a listing of 1: lenient (history
    // shorter than five), so complete. A late fifth listing of 20 makes the
    // history long enough for the median rule, and the listing of 1 becomes
    // incomplete: its miss no longer counts.
    const small = FILLER.slice(0, 20);
    const early = [0, 1, 2, 3].map((n) => listing(n, [42], small));
    const t = run({}, [...early, listing(5, [], [1]), listing(6, [], small)]);
    expect(t.outcomes().get(42)).toMatchObject({ isDeleted: true });
    t.apply(listing(4, [42], small));
    expect(t.outcomes().get(42)).toMatchObject({
      isDeleted: false,
      lastSeen: at(4),
      missing: true,
    });
  });

  it("starts from the database's lastSeenAt for contracts stored before the log", () => {
    const t = timeline();
    t.preload(42, at(-50), at(-3));
    for (const id of FILLER) t.preload(id, at(-50), at(-3));
    t.apply(listing(0, []));
    expect(t.outcomes().get(42)).toMatchObject({
      lastSeen: at(-3),
      missing: true,
    });
  });

  it("does not let a region listed as empty end everything on the first run", () => {
    const t = timeline();
    for (let id = 1; id <= 300; id++) t.preload(id, at(-50), at(-1));
    t.apply({ regionId: REGION, observedAt: at(0), contractIds: [] });
    t.apply({ regionId: REGION, observedAt: at(1), contractIds: [] });
    expect([...t.outcomes().values()].every((o) => !o.isDeleted)).toBe(true);
  });

  it("checkpoints lastSeenAt to the latest listing, but leaves missing contracts alone", () => {
    const t = run({}, [
      ...steadyHistory(),
      listing(0, [42, 43]),
      listing(1, [42]),
    ]);
    t.checkpoint();
    const rows = t.rows();
    expect(rows.get(42)?.lastSeenAt).toBe(at(1));
    expect(rows.get(43)).toMatchObject({
      lastSeenAt: at(0),
      absence: { lastSeenAt: at(0), ended: false },
    });
  });
});

/** Apply observations, then the daily checkpoint: the database's final rows. */
const final = (
  s: ReturnType<typeof scenario>,
  observations: readonly Observation[],
  preload: (t: MemoryTimeline) => void = () => undefined,
) => {
  const t = new MemoryTimeline(s.expiryOf, s.regionOf);
  preload(t);
  for (const o of observations) t.apply(o);
  t.checkpoint();
  return t;
};

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);

describe("against the snapshot ingest's own algorithm", () => {
  it.each(SEEDS)(
    "agrees with it on every contract, observations in time order (seed %i)",
    (seed) => {
      const s = scenario(seed, { regions: [10000002, 10000043] });
      const inOrder = [...s.observations].sort(
        (a, b) => a.observedAt - b.observedAt,
      );
      expect(final(s, inOrder).outcomes()).toEqual(
        snapshotIngestOracle(inOrder, s.expiryOf),
      );
    },
  );
});

describe("order independence and idempotency", () => {
  it.each(SEEDS)(
    "ends up with the same rows whatever order the observations arrive in (seed %i)",
    (seed) => {
      const s = scenario(seed, { regions: [10000002, 10000043] });
      const rnd = prng(seed * 7919);
      const reference = final(s, s.observations);
      for (let k = 0; k < 4; k++) {
        const t = final(s, shuffle(s.observations, rnd));
        expect(t.rows()).toEqual(reference.rows());
        expect(t.sortedLogs()).toEqual(reference.sortedLogs());
      }
    },
  );

  it.each(SEEDS)(
    "changes nothing when every observation is applied again (seed %i)",
    (seed) => {
      const s = scenario(seed);
      const rnd = prng(seed * 104729);
      const t = final(s, s.observations);
      const rows = t.rows();
      for (const o of shuffle(s.observations, rnd)) {
        const r = t.apply(o);
        expect(r.inserts).toEqual([]);
        expect(r.updates).toEqual([]);
      }
      expect(t.rows()).toEqual(rows);
    },
  );

  it.each(SEEDS)(
    "treats two sources' copies of one listing, one of them partial, as one listing (seed %i)",
    (seed) => {
      const s = scenario(seed);
      const rnd = prng(seed * 15485863);
      const reference = final(s, s.observations);
      // Each listing is read by both sources; one copy is whole, the other
      // lost anything from none to all of it (a failed scrape), and either
      // may arrive first.
      const copies = s.observations.flatMap((o) => {
        const keep = rnd();
        const partial = {
          ...o,
          contractIds: o.contractIds.filter(() => rnd() < keep),
        };
        return rnd() < 0.5 ? [o, partial] : [partial, o];
      });
      expect(final(s, shuffle(copies, rnd)).rows()).toEqual(reference.rows());
    },
  );

  it("exercises every path across the scenarios", () => {
    const seen = {
      RemovedBeforeExpiry: 0,
      Expired: 0,
      unknown: 0,
      reopened: 0,
      missing: 0,
      incomplete: 0,
      lateCorrections: 0,
    };
    for (const seed of SEEDS) {
      const s = scenario(seed, { regions: [10000002, 10000043] });
      const t = final(s, s.observations);
      for (const o of t.outcomes().values()) {
        if (o.isDeleted) seen[o.endReason ?? "unknown"]++;
        else if (o.missing) seen.missing++;
      }
      for (const log of t.logs.values()) {
        seen.incomplete += [...completenessOf(log).values()].filter(
          (c) => !c,
        ).length;
      }
      const oracle = snapshotIngestOracle(
        [...s.observations].sort((a, b) => a.observedAt - b.observedAt),
        s.expiryOf,
      );
      // Reopened: ended at some point, outstanding at the end.
      const replay = new MemoryTimeline(s.expiryOf, s.regionOf);
      const everEnded = new Set<number>();
      for (const o of [...s.observations].sort(
        (a, b) => a.observedAt - b.observedAt,
      )) {
        replay.apply(o);
        for (const [id, c] of replay.contracts)
          if (c.isDeleted) everEnded.add(id);
      }
      for (const id of everEnded) {
        if (oracle.get(id)?.isDeleted === false) seen.reopened++;
      }
      // Late corrections: applying newest-first changes something on the
      // way back in time.
      const late = new MemoryTimeline(s.expiryOf, s.regionOf);
      for (const o of [...s.observations].sort(
        (a, b) => b.observedAt - a.observedAt,
      )) {
        seen.lateCorrections += late.apply(o).updates.length;
      }
    }
    for (const n of Object.values(seen)) expect(n).toBeGreaterThan(20);
  });

  it.each(SEEDS.slice(0, 100))(
    "stays order-independent on top of contracts the snapshot ingest stored before the log (seed %i)",
    (seed) => {
      const s = scenario(seed);
      const rnd = prng(seed * 31337);
      const first = Math.min(...s.observations.map((o) => o.observedAt));
      // What the database already holds: some contracts, last seen a while
      // before the first observation.
      const preload = (t: MemoryTimeline) => {
        for (const id of new Set(
          s.observations.flatMap((o) => o.contractIds),
        )) {
          if (id % 3 === 0) t.preload(id, first - 10 * HOUR, first - HOUR);
        }
      };
      const reference = final(s, s.observations, preload);
      for (let k = 0; k < 3; k++) {
        expect(final(s, shuffle(s.observations, rnd), preload).rows()).toEqual(
          reference.rows(),
        );
      }
    },
  );

  it.each(SEEDS.slice(0, 100))(
    "stays order-independent when stored contracts were last seen in the middle of the observations (seed %i)",
    (seed) => {
      // The snapshot ingest re-applying snapshots from before its own last
      // checkpoint: the database's lastSeenAt lies among the observations.
      const s = scenario(seed);
      const rnd = prng(seed * 7727);
      const times = s.observations
        .map((o) => o.observedAt)
        .sort((a, b) => a - b);
      const preload = (t: MemoryTimeline) => {
        for (const id of new Set(
          s.observations.flatMap((o) => o.contractIds),
        )) {
          if (id % 2 === 0) {
            const lastSeen = times[id % times.length]! + 60_000;
            t.preload(id, times[0]! - HOUR, lastSeen);
          }
        }
      };
      const reference = final(s, s.observations, preload);
      for (let k = 0; k < 3; k++) {
        expect(final(s, shuffle(s.observations, rnd), preload).rows()).toEqual(
          reference.rows(),
        );
      }
    },
  );
});
