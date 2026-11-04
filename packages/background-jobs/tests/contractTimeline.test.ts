import { describe, expect, it } from "@jest/globals";

import type {
  ContractEndReason,
  OutstandingContract,
  RegionHistory,
} from "../helpers/contractTimeline";
import {
  AUCTION_EXPIRY_SLACK_MS,
  endReasonOf,
  GAP_MS,
  isRegionComplete,
  MIN_HISTORY,
  planRegionListing,
  REGION_HISTORY_LENGTH,
} from "../helpers/contractTimeline";

const MIN = 60_000;
const T0 = Date.UTC(2026, 10, 3, 21, 8, 12);
/** The listing generation `n` half-hours after T0. */
const at = (n: number) => T0 + n * 30 * MIN;
/** Contracts always listed, so a listing of the region counts as complete. */
const FILLER = Array.from({ length: 100 }, (_, i) => 1_000_000 + i);
const ids = (...xs: number[]) => new Set([...xs, ...FILLER]);
/** A region whose last ten listings held ~100 contracts, the last at `n`. */
const steady = (n: number): RegionHistory => ({
  lastModified: at(n),
  lastCompleteAt: at(n),
  counts: Array<number>(10).fill(FILLER.length),
});
const outstanding = (
  contractId: number,
  dateExpired = at(1000),
  lastSeenAt = at(-100),
  isAuction = false,
): OutstandingContract => ({ contractId, dateExpired, isAuction, lastSeenAt });
const fillerOutstanding = FILLER.map((id) => outstanding(id));

describe("isRegionComplete", () => {
  it("treats a collapse below 70% of the median as incomplete", () => {
    const history = Array<number>(10).fill(1000);
    expect(isRegionComplete(history, 700)).toBe(true);
    expect(isRegionComplete(history, 699)).toBe(false);
    expect(isRegionComplete(history, 0)).toBe(false);
  });

  it("treats tiny regions as complete when present", () => {
    expect(isRegionComplete(Array<number>(10).fill(10), 1)).toBe(true);
    expect(isRegionComplete(Array<number>(10).fill(10), 0)).toBe(false);
    // So small that an empty listing is plausible.
    expect(isRegionComplete(Array<number>(10).fill(2), 0)).toBe(true);
  });

  it("judges a short history by presence alone", () => {
    expect(isRegionComplete([1000, 1000], 1)).toBe(true);
    expect(isRegionComplete([1000, 1000], 0)).toBe(false);
  });
});

describe("endReasonOf", () => {
  it("removed before expiry when the expiry was still ahead, whatever the gap", () => {
    expect(endReasonOf(at(10), at(0), at(1))).toBe("RemovedBeforeExpiry");
    expect(endReasonOf(at(100), at(0), at(50))).toBe("RemovedBeforeExpiry");
  });

  it("expired when it expired between last seen and first missed", () => {
    expect(endReasonOf(at(1) - MIN, at(0), at(1))).toBe("Expired");
    // An expiry exactly at the listing is no longer ahead.
    expect(endReasonOf(at(1), at(0), at(1))).toBe("Expired");
  });

  it("unknown when that window is longer than the gap", () => {
    expect(endReasonOf(at(0), at(0), at(0) + GAP_MS)).toBe("Expired");
    expect(endReasonOf(at(0), at(0), at(0) + GAP_MS + 1)).toBeNull();
  });

  it("allows for an expiry that may be above the truth", () => {
    const slack = AUCTION_EXPIRY_SLACK_MS;
    expect(endReasonOf(at(1) + slack, at(0), at(1), slack)).toBe("Expired");
    expect(endReasonOf(at(1) + slack + 1, at(0), at(1), slack)).toBe(
      "RemovedBeforeExpiry",
    );
  });
});

describe("planRegionListing", () => {
  it("skips a listing already applied, or older than one that was", () => {
    const history = steady(5);
    for (const n of [5, 4]) {
      expect(
        planRegionListing({
          history,
          observedAt: at(n),
          listedIds: ids(),
          outstanding: [outstanding(1), ...fillerOutstanding],
        }),
      ).toEqual({ skip: true });
    }
  });

  it("ends a contract on its first miss, last seen in the previous complete listing", () => {
    const plan = planRegionListing({
      history: steady(5),
      observedAt: at(6),
      listedIds: ids(2),
      outstanding: [
        outstanding(1, at(100)),
        outstanding(2),
        outstanding(3, at(6) - MIN),
        ...fillerOutstanding,
      ],
    });
    expect(plan).toMatchObject({
      skip: false,
      complete: true,
      ends: [
        {
          contractId: 1,
          lastSeenAt: at(5),
          endReason: "RemovedBeforeExpiry",
        },
        { contractId: 3, lastSeenAt: at(5), endReason: "Expired" },
      ],
      history: { lastModified: at(6), lastCompleteAt: at(6) },
    });
  });

  it("reads an auction whose rounded-up expiry is still ahead as expired", () => {
    // It expired at 5:45. The listing at 5 gave 5 + 1 h, a second late by
    // Last-Modified jitter: after the listing at 6 that misses it.
    const rounded = at(7) + 1000;
    const plan = planRegionListing({
      history: steady(5),
      observedAt: at(6),
      listedIds: ids(),
      outstanding: [
        outstanding(1, rounded, at(-1), true),
        // The same expiry on another type is exact: removed before it.
        outstanding(2, rounded),
        // An auction taken down hours before its expiry is still removed.
        outstanding(3, at(6) + 3 * 60 * MIN, at(-1), true),
      ],
    });
    expect(!plan.skip && plan.ends.map((e) => e.endReason)).toEqual([
      "Expired",
      "RemovedBeforeExpiry",
      "RemovedBeforeExpiry",
    ]);
  });

  it("leaves an expired contract's reason unknown after a long gap", () => {
    // The job was down for three hours: listings 6 to 11 were never read.
    const plan = planRegionListing({
      history: steady(5),
      observedAt: at(12),
      listedIds: ids(),
      outstanding: [
        outstanding(1, at(8)),
        outstanding(2, at(20)),
        ...fillerOutstanding,
      ],
    });
    expect(!plan.skip && plan.ends).toEqual([
      { contractId: 1, lastSeenAt: at(5), endReason: null },
      { contractId: 2, lastSeenAt: at(5), endReason: "RemovedBeforeExpiry" },
    ]);
  });

  it("ends nothing from an incomplete listing, and keeps its count", () => {
    const plan = planRegionListing({
      history: steady(5),
      observedAt: at(6),
      listedIds: new Set(FILLER.slice(0, 50)),
      outstanding: fillerOutstanding,
    });
    expect(plan).toEqual({
      skip: false,
      complete: false,
      ends: [],
      history: {
        lastModified: at(6),
        lastCompleteAt: at(5),
        counts: [...Array<number>(10).fill(100), 50],
      },
    });
  });

  it("takes a stored lastSeen later than the previous complete listing", () => {
    // Contract 1 was first stored from an incomplete listing at 7.
    const history: RegionHistory = {
      ...steady(5),
      lastModified: at(7),
      counts: [...steady(5).counts, 50, 50],
    };
    const plan = planRegionListing({
      history,
      observedAt: at(8),
      listedIds: ids(),
      outstanding: [outstanding(1, at(7) + MIN, at(7)), ...fillerOutstanding],
    });
    expect(!plan.skip && plan.ends).toEqual([
      { contractId: 1, lastSeenAt: at(7), endReason: "Expired" },
    ]);
  });

  it("judges a region's first listing against the contracts stored there", () => {
    const stored = [outstanding(1, at(100), at(-2)), ...fillerOutstanding];
    // Most of the region missing: a failed listing, not 100 contracts ending.
    const failed = planRegionListing({
      history: null,
      observedAt: at(0),
      listedIds: new Set([FILLER[0]!]),
      outstanding: stored,
    });
    expect(failed).toMatchObject({ complete: false, ends: [] });
    expect(!failed.skip && failed.history.lastCompleteAt).toBeNull();

    // A full listing ends what it lacks, from the stored lastSeen.
    const full = planRegionListing({
      history: null,
      observedAt: at(0),
      listedIds: ids(),
      outstanding: stored,
    });
    expect(full).toMatchObject({
      complete: true,
      ends: [
        {
          contractId: 1,
          lastSeenAt: at(-2),
          endReason: "RemovedBeforeExpiry",
        },
      ],
      history: { lastModified: at(0), lastCompleteAt: at(0) },
    });
  });

  it("does not judge a region that has never listed anything", () => {
    const plan = planRegionListing({
      history: null,
      observedAt: at(0),
      listedIds: new Set(),
      outstanding: [],
    });
    expect(plan).toEqual({
      skip: false,
      complete: false,
      ends: [],
      history: { lastModified: at(0), lastCompleteAt: null, counts: [] },
    });
  });

  it("absorbs a genuine decline within a few listings", () => {
    let history: RegionHistory | null = steady(0);
    const half = new Set(FILLER.slice(0, 50));
    const completeness: boolean[] = [];
    for (let n = 1; n <= 12; n++) {
      const plan = planRegionListing({
        history,
        observedAt: at(n),
        listedIds: half,
        outstanding: [...half].map((id) => outstanding(id)),
      });
      if (plan.skip) throw new Error("not skipped");
      completeness.push(plan.complete);
      history = plan.history;
    }
    expect(completeness.slice(0, 5)).toEqual(Array<boolean>(5).fill(false));
    expect(completeness.at(-1)).toBe(true);
    expect(history.counts).toHaveLength(REGION_HISTORY_LENGTH);
  });
});

// A simulated region: contracts with random lifetimes, listings that are now
// and then incomplete or never read, applied through an in-memory mirror of
// `contractTimelineStore.ts`.

/** Deterministic PRNG (mulberry32), so a failing seed reproduces. */
const prng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

interface Truth {
  contractId: number;
  /** Its listings give a rounded-up expiry (see `contractTimeline.ts`). */
  isAuction: boolean;
  /** First and last listing generation it is in (inclusive). */
  from: number;
  to: number;
  dateExpired: number;
}
interface Row {
  isAuction: boolean;
  dateExpired: number;
  firstSeenAt: number;
  lastSeenAt: number;
  isDeleted: boolean;
  endReason: ContractEndReason | null;
}

const world = (random: () => number, generations: number) => {
  const truths: Truth[] = [];
  let next = 1;
  for (let g = 0; g < generations; g++) {
    // ~120 live at any time (8 a listing, living 15.5 listings on average):
    // a steady region, so its listings stay complete.
    const born = g === 0 ? 120 : 6 + Math.floor(random() * 5);
    for (let i = 0; i < born; i++) {
      const life = 1 + Math.floor(random() * 30);
      // Some expire (their expiry falls in the half-hour after they leave),
      // the rest are taken down while their expiry is still ahead.
      const expires = random() < 0.4;
      truths.push({
        contractId: next++,
        isAuction: random() < 0.3,
        from: g,
        to: g + life - 1,
        dateExpired: expires
          ? at(g + life) - Math.floor(random() * 29 * MIN) - MIN
          : at(g + life + 1 + Math.floor(random() * 100)),
      });
    }
  }
  return truths;
};

const DAY = 24 * 60 * MIN;
/** The expiry a listing at generation `g` gives: ESI's, rounded up for auctions. */
const reportedExpiry = (t: Truth, g: number) => {
  if (!t.isAuction) return t.dateExpired;
  const left = t.dateExpired - at(g);
  const unit = left > DAY ? DAY : 60 * MIN;
  return at(g) + Math.ceil(left / unit) * unit;
};

const simulate = (seed: number, { flaky }: { flaky: boolean }) => {
  const random = prng(seed);
  const generations = 80;
  const truths = world(random, generations);
  const rows = new Map<number, Row>();
  let history: RegionHistory | null = null;
  /**
   * Generations the job read: whether that listing was whole, and whether the
   * engine judged it complete.
   */
  const read: { g: number; whole: boolean; complete: boolean }[] = [];
  for (let g = 0; g < generations; g++) {
    // The first listings are read whole, as a deployed job's are judged
    // against the contracts already stored: a region the job knows nothing
    // about counts any non-empty listing as complete.
    const roll = g < MIN_HISTORY ? 1 : random();
    if (flaky && roll < 0.1) continue; // never read (downtime, ESI error)
    const whole = !flaky || roll > 0.2;
    const live = truths.filter((t) => t.from <= g && g <= t.to);
    const listed = whole ? live : live.filter(() => random() < 0.3);
    const entry = { g, whole, complete: false };
    read.push(entry);
    for (let repeat = 0; repeat < (random() < 0.2 ? 2 : 1); repeat++) {
      const plan = planRegionListing({
        history,
        observedAt: at(g),
        listedIds: new Set(listed.map((t) => t.contractId)),
        outstanding: [...rows]
          .filter(([, r]) => !r.isDeleted)
          .map(([contractId, r]) => ({
            contractId,
            dateExpired: r.dateExpired,
            isAuction: r.isAuction,
            lastSeenAt: r.lastSeenAt,
          })),
      });
      if (plan.skip) {
        expect(repeat).toBe(1);
        continue;
      }
      for (const t of listed) {
        const row = rows.get(t.contractId);
        if (row) {
          // The store keeps an auction's lowest expiry seen.
          row.dateExpired = Math.min(row.dateExpired, reportedExpiry(t, g));
        }
        if (!row) {
          rows.set(t.contractId, {
            isAuction: t.isAuction,
            dateExpired: reportedExpiry(t, g),
            firstSeenAt: at(g),
            lastSeenAt: at(g),
            isDeleted: false,
            endReason: null,
          });
        } else if (row.isDeleted) {
          Object.assign(row, {
            isDeleted: false,
            endReason: null,
            lastSeenAt: Math.max(row.lastSeenAt, at(g)),
          });
        }
      }
      for (const e of plan.ends) {
        Object.assign(rows.get(e.contractId)!, {
          isDeleted: true,
          endReason: e.endReason,
          lastSeenAt: e.lastSeenAt,
        });
      }
      entry.complete = plan.complete;
      history = plan.history;
    }
  }
  return { truths, rows, read };
};

describe("against a simulated region", () => {
  const cases = Array.from({ length: 60 }, (_, i) => i + 1).flatMap((seed) => [
    { seed, flaky: false },
    { seed, flaky: true },
  ]);

  it.each(cases)(
    "ends each gone contract at the next complete listing, never a live one (seed $seed, flaky $flaky)",
    ({ seed, flaky }) => {
      const { truths, rows, read } = simulate(seed, { flaky });
      // The completeness gate is what keeps a partial listing from ending
      // live contracts: no listing read in part may pass it.
      expect(read.filter((r) => r.complete && !r.whole)).toEqual([]);
      const completeAt = new Set(
        read.filter((r) => r.complete).map((r) => r.g),
      );
      let exact = 0;
      for (const t of truths) {
        const row = rows.get(t.contractId);
        const readWhile = read.filter((r) => t.from <= r.g && r.g <= t.to);
        if (!row) {
          // Only ever live in listings the job never read, or read in part.
          expect(readWhile.some((r) => r.whole)).toBe(false);
          continue;
        }
        const missedIn = read.find((r) => r.complete && r.g > t.to);
        expect(row.isDeleted).toBe(missedIn !== undefined);
        if (!missedIn) continue;
        // Last seen no later than the truth, and no earlier than the last
        // complete listing that showed it.
        const lastComplete = readWhile.filter((r) => r.complete).at(-1);
        expect(row.lastSeenAt).toBeLessThanOrEqual(at(t.to));
        expect(row.lastSeenAt).toBeGreaterThanOrEqual(
          Math.max(
            row.firstSeenAt,
            lastComplete ? at(lastComplete.g) : -Infinity,
          ),
        );
        const slack = t.isAuction ? AUCTION_EXPIRY_SLACK_MS : 0;
        // A stored expiry is never below the truth, and an auction's is within
        // the slack of it once seen in its last hour.
        expect(row.dateExpired).toBeGreaterThanOrEqual(t.dateExpired);
        // The reason follows from what the job saw ...
        expect(row.endReason).toBe(
          endReasonOf(row.dateExpired, row.lastSeenAt, at(missedIn.g), slack),
        );
        // ... and is exactly the truth when the job judged complete both the
        // contract's last listing and the one after: an auction's too, unless
        // it was taken down within the slack of its expiry.
        if (completeAt.has(t.to) && missedIn.g === t.to + 1) {
          expect(row.lastSeenAt).toBe(at(t.to));
          const ambiguous =
            t.isAuction &&
            t.dateExpired > at(t.to + 1) &&
            t.dateExpired <= at(t.to + 1) + slack;
          if (!ambiguous) {
            expect(row.endReason).toBe(
              endReasonOf(t.dateExpired, at(t.to), at(t.to + 1)),
            );
          }
          expect(row.endReason).not.toBeNull();
          exact++;
        }
      }
      // The simulation does exercise the exact case.
      expect(exact).toBeGreaterThan(flaky ? 50 : 300);
    },
  );

  it.each(cases)(
    "records each contract's first sighting (seed $seed, flaky $flaky)",
    ({ seed, flaky }) => {
      const { truths, rows, read } = simulate(seed, { flaky });
      for (const t of truths) {
        const row = rows.get(t.contractId);
        if (!row) continue;
        expect(row.firstSeenAt).toBeGreaterThanOrEqual(at(t.from));
        if (!flaky) expect(row.firstSeenAt).toBe(at(t.from));
        expect(read.some((r) => at(r.g) === row.firstSeenAt)).toBe(true);
      }
    },
  );
});
