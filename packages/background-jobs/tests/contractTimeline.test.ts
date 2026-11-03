import { describe, expect, it } from "@jest/globals";

import type {
  OutstandingContract,
  RegionObservation,
  TimelineState,
} from "../helpers/contractTimeline";
import {
  CHECKPOINT_MS,
  emptyTimelineState,
  endReasonOf,
  GAP_MS,
  isRegionComplete,
  planContractTimeline,
  seedRegionHistories,
} from "../helpers/contractTimeline";

const MIN = 60_000;
const HOUR = 60 * MIN;
const T0 = Date.UTC(2026, 10, 3, 12, 8);
/** The listing generation `n` runs after T0. */
const at = (n: number) => T0 + n * 30 * MIN;

const REGION = 10000002;
/** A region whose recent counts make a listing of ~100 complete. */
const steadyState = (
  overrides: Partial<TimelineState> = {},
): TimelineState => ({
  ...emptyTimelineState(),
  regions: { [REGION]: { lastModified: at(0), history: Array(10).fill(100) } },
  lastCheckpointAt: at(0),
  ...overrides,
});

/** `count` filler contracts plus `ids`, so the region stays complete. */
const listing = (n: number, ids: number[], count = 100): RegionObservation => ({
  regionId: REGION,
  observedAt: at(n),
  contractIds: new Set([
    ...ids,
    ...Array.from({ length: count - ids.length }, (_, i) => 1_000_000 + i),
  ]),
});

const contract = (
  contractId: number,
  overrides: Partial<OutstandingContract> = {},
): OutstandingContract => ({
  contractId,
  regionId: REGION,
  dateExpired: at(0) + 7 * 24 * HOUR,
  lastSeenAt: at(0),
  ...overrides,
});

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
    expect(isRegionComplete([], 0)).toBe(true);
    expect(isRegionComplete([35000], 10)).toBe(true);
    expect(isRegionComplete([35000], 0)).toBe(false);
  });
});

describe("endReasonOf", () => {
  it("is RemovedBeforeExpiry when it vanished before expiring, however long the gap", () => {
    expect(endReasonOf(at(10), { lastSeen: at(0), firstMissed: at(5) })).toBe(
      "RemovedBeforeExpiry",
    );
  });

  it("is Expired when it expired between last seen and first missed", () => {
    expect(endReasonOf(at(1), { lastSeen: at(0), firstMissed: at(2) })).toBe(
      "Expired",
    );
  });

  it("is unknown when that window is longer than GAP_MS", () => {
    expect(
      endReasonOf(at(1), { lastSeen: at(0), firstMissed: at(0) + GAP_MS + 1 }),
    ).toBeNull();
    expect(
      endReasonOf(at(1), { lastSeen: at(0), firstMissed: at(0) + GAP_MS }),
    ).toBe("Expired");
  });
});

describe("planContractTimeline", () => {
  it("reports a contract appearing for the first time as seen", () => {
    const plan = planContractTimeline({
      state: steadyState(),
      outstanding: [],
      observations: [listing(1, [42])],
      now: at(1),
    });
    expect(plan.seen.get(42)).toBe(at(1));
    expect(plan.ended).toEqual([]);
    expect(plan.state.regions[REGION]?.lastModified).toBe(at(1));
  });

  it("counts one miss without ending the contract", () => {
    const plan = planContractTimeline({
      state: steadyState(),
      outstanding: [contract(42)],
      observations: [listing(1, [])],
      now: at(1),
    });
    expect(plan.ended).toEqual([]);
    expect(plan.state.missing[42]).toEqual({
      lastSeen: at(0),
      firstMissed: at(1),
      missed: 1,
    });
  });

  it("ends a contract missing from two complete listings", () => {
    const first = planContractTimeline({
      state: steadyState(),
      outstanding: [contract(42)],
      observations: [listing(1, [])],
      now: at(1),
    });
    const second = planContractTimeline({
      state: first.state,
      outstanding: [contract(42)],
      observations: [listing(2, [])],
      now: at(2),
    });
    expect(second.ended).toEqual([
      { contractId: 42, lastSeen: at(0), reason: "RemovedBeforeExpiry" },
    ]);
    expect(second.state.missing[42]).toBeUndefined();
  });

  it("does not count a miss in an incomplete region", () => {
    const outstanding = [contract(42)];
    let state = steadyState();
    for (const n of [1, 2, 3]) {
      // The listing collapsed to 10 of its usual 100.
      const plan = planContractTimeline({
        state,
        outstanding,
        observations: [listing(n, [], 10)],
        now: at(n),
      });
      expect(plan.ended).toEqual([]);
      expect(plan.incompleteRegions).toEqual([REGION]);
      state = plan.state;
    }
    // Missing since the first partial listing, but never counted.
    expect(state.missing[42]).toEqual({
      lastSeen: at(0),
      firstMissed: at(1),
      missed: 0,
    });
  });

  it("clears a miss when the contract reappears", () => {
    const first = planContractTimeline({
      state: steadyState(),
      outstanding: [contract(42)],
      observations: [listing(1, [])],
      now: at(1),
    });
    const second = planContractTimeline({
      state: first.state,
      outstanding: [contract(42)],
      observations: [listing(2, [42])],
      now: at(2),
    });
    expect(second.state.missing[42]).toBeUndefined();
    const third = planContractTimeline({
      state: second.state,
      outstanding: [contract(42)],
      observations: [listing(3, [])],
      now: at(3),
    });
    // Starts over, last seen in the listing it reappeared in.
    expect(third.ended).toEqual([]);
    expect(third.state.missing[42]).toEqual({
      lastSeen: at(2),
      firstMissed: at(3),
      missed: 1,
    });
  });

  it("reports an ended contract that is listed again as seen, so it is reopened", () => {
    // Ended: not outstanding any more, and listed again.
    const plan = planContractTimeline({
      state: steadyState(),
      outstanding: [],
      observations: [listing(1, [42])],
      now: at(1),
    });
    expect(plan.seen.get(42)).toBe(at(1));
  });

  it("leaves expiry across a long gap unknown", () => {
    // Last listed at T0, expired an hour later; the job was down for 5 hours.
    const outstanding = [contract(42, { dateExpired: at(0) + HOUR })];
    const first = planContractTimeline({
      state: steadyState(),
      outstanding,
      observations: [listing(10, [])],
      now: at(10),
    });
    const second = planContractTimeline({
      state: first.state,
      outstanding,
      observations: [listing(11, [])],
      now: at(11),
    });
    expect(second.ended).toEqual([
      { contractId: 42, lastSeen: at(0), reason: null },
    ]);
  });

  it("marks expiry within a short gap as Expired", () => {
    const outstanding = [contract(42, { dateExpired: at(0) + 10 * MIN })];
    const first = planContractTimeline({
      state: steadyState(),
      outstanding,
      observations: [listing(1, [])],
      now: at(1),
    });
    const second = planContractTimeline({
      state: first.state,
      outstanding,
      observations: [listing(2, [])],
      now: at(2),
    });
    expect(second.ended[0]?.reason).toBe("Expired");
  });

  it("ignores a listing it has already applied (a retry or an overlapping run)", () => {
    const outstanding = [contract(42)];
    const first = planContractTimeline({
      state: steadyState(),
      outstanding,
      observations: [listing(1, [])],
      now: at(1),
    });
    // The same listing again, against the state the first run saved.
    const again = planContractTimeline({
      state: first.state,
      outstanding,
      observations: [listing(1, [])],
      now: at(1) + 5 * MIN,
    });
    expect(again.ended).toEqual([]);
    expect(again.state.missing[42]?.missed).toBe(1);
    expect(again.unchangedRegions).toEqual([REGION]);
    expect(again.seen.size).toBe(0);
  });

  it("gives the same answer when retried against the state it started from", () => {
    const args = {
      state: steadyState({
        missing: { 42: { lastSeen: at(0), firstMissed: at(1), missed: 1 } },
        regions: {
          [REGION]: { lastModified: at(1), history: Array(10).fill(100) },
        },
      }),
      outstanding: [contract(42), contract(43)],
      observations: [listing(2, [])],
      now: at(2),
    };
    const plan = planContractTimeline(args);
    expect(planContractTimeline(args)).toEqual(plan);
    expect(plan.ended.map((e) => e.contractId)).toEqual([42]);
    expect(plan.state.missing[43]?.missed).toBe(1);
  });

  it("uses the database's lastSeenAt when the region has no observation on record", () => {
    const outstanding = [contract(42, { lastSeenAt: at(-3) })];
    const plan = planContractTimeline({
      state: seedRegionHistories(emptyTimelineState(), [
        ...outstanding,
        ...Array.from({ length: 99 }, (_, i) => contract(500 + i)),
      ]),
      outstanding,
      observations: [listing(1, [])],
      now: at(1),
    });
    expect(plan.state.missing[42]).toEqual({
      lastSeen: at(-3),
      firstMissed: at(1),
      missed: 1,
    });
  });

  it("does not let a region listed as empty end everything on the first run", () => {
    const outstanding = Array.from({ length: 35000 }, (_, i) =>
      contract(i + 1),
    );
    const state = seedRegionHistories(emptyTimelineState(), outstanding);
    const plan = planContractTimeline({
      state,
      outstanding,
      observations: [
        { regionId: REGION, observedAt: at(1), contractIds: new Set() },
      ],
      now: at(1),
    });
    expect(plan.incompleteRegions).toEqual([REGION]);
    expect(Object.values(plan.state.missing).every((m) => m.missed === 0)).toBe(
      true,
    );
  });

  it("leaves regions it did not observe alone", () => {
    const plan = planContractTimeline({
      state: steadyState(),
      outstanding: [contract(42, { regionId: 10000043 })],
      observations: [listing(1, [])],
      now: at(1),
    });
    expect(plan.state.missing[42]).toBeUndefined();
  });

  it("forgets missing entries for contracts no longer outstanding", () => {
    const plan = planContractTimeline({
      state: steadyState({
        missing: { 7: { lastSeen: at(0), firstMissed: at(1), missed: 1 } },
      }),
      outstanding: [],
      observations: [],
      now: at(1),
    });
    expect(plan.state.missing).toEqual({});
  });

  describe("daily checkpoint", () => {
    it("is not written within a day of the last one", () => {
      const plan = planContractTimeline({
        state: steadyState({ lastCheckpointAt: at(1) }),
        outstanding: [contract(42)],
        observations: [listing(2, [42])],
        now: at(1) + CHECKPOINT_MS - 1,
      });
      expect(plan.checkpoint).toBeNull();
      expect(plan.state.lastCheckpointAt).toBe(at(1));
    });

    it("writes lastSeen for every outstanding contract once a day", () => {
      const now = at(0) + CHECKPOINT_MS;
      const plan = planContractTimeline({
        state: steadyState({
          missing: { 43: { lastSeen: at(1), firstMissed: at(2), missed: 0 } },
        }),
        outstanding: [contract(42), contract(43), contract(44)],
        observations: [listing(48, [42, 44])],
        now,
      });
      expect(plan.checkpoint).toEqual([
        { contractId: 42, lastSeen: at(48) },
        // Missing: when it was last listed, not now.
        { contractId: 43, lastSeen: at(1) },
        { contractId: 44, lastSeen: at(48) },
      ]);
      expect(plan.state.lastCheckpointAt).toBe(now);
    });

    it("skips contracts that ended in the same run", () => {
      const plan = planContractTimeline({
        state: steadyState({
          lastCheckpointAt: 0,
          missing: { 42: { lastSeen: at(0), firstMissed: at(1), missed: 1 } },
        }),
        outstanding: [contract(42), contract(43)],
        observations: [listing(2, [43])],
        now: at(2),
      });
      expect(plan.ended.map((e) => e.contractId)).toEqual([42]);
      expect(plan.checkpoint).toEqual([{ contractId: 43, lastSeen: at(2) }]);
    });
  });
});

describe("seedRegionHistories", () => {
  it("seeds only regions with no history", () => {
    const state = seedRegionHistories(
      {
        ...emptyTimelineState(),
        regions: { 1: { lastModified: 5, history: [9] } },
      },
      [
        contract(1, { regionId: 1 }),
        contract(2, { regionId: 2 }),
        contract(3, { regionId: 2 }),
      ],
    );
    expect(state.regions).toEqual({
      1: { lastModified: 5, history: [9] },
      2: { lastModified: 0, history: [2] },
    });
  });
});
