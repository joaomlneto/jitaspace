import { describe, expect, it } from "@jest/globals";

import {
  formatCountdown,
  formatDuration,
  highSecSpawnOutlook,
  latestEnd,
  longestDistanceAu,
  METERS_PER_AU,
  sampleInfluence,
} from "~/app/incursions/math";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const T0 = Date.parse("2026-10-06T00:00:00Z");

describe("latestEnd", () => {
  it("adds each state's longest remaining life", () => {
    expect(latestEnd("established", T0)).toBe(T0 + 8 * DAY);
    expect(latestEnd("mobilizing", T0)).toBe(T0 + 3 * DAY);
    expect(latestEnd("withdrawing", T0)).toBe(T0 + DAY);
  });
});

describe("formatCountdown", () => {
  it("shows hours, padded minutes and seconds under a day", () => {
    expect(formatCountdown(9 * HOUR + 31 * 60_000 + 28_000)).toBe("9:31:28");
    expect(formatCountdown(65_000)).toBe("0:01:05");
  });

  it("counts whole days apart from a day or more", () => {
    expect(formatCountdown(57 * HOUR + 31 * 60_000 + 28_000)).toBe(
      "2d 09:31:28",
    );
    expect(formatCountdown(DAY)).toBe("1d 00:00:00");
  });

  it("stops at zero", () => {
    expect(formatCountdown(-5000)).toBe("0:00:00");
  });
});

describe("formatDuration", () => {
  it("picks the two largest units", () => {
    expect(formatDuration(2 * DAY + 4 * HOUR)).toBe("2d 4h");
    expect(formatDuration(3 * HOUR + 20 * 60_000)).toBe("3h 20m");
    expect(formatDuration(45 * 60_000)).toBe("45m");
  });
});

describe("longestDistanceAu", () => {
  it("finds the farthest pair", () => {
    const au = METERS_PER_AU;
    expect(
      longestDistanceAu([
        { x: 0, y: 0, z: 0 },
        { x: 3 * au, y: 0, z: 0 },
        { x: 0, y: 4 * au, z: 0 },
        { x: au, y: au, z: 0 },
      ]),
    ).toBeCloseTo(5);
  });

  it("is zero with fewer than two points", () => {
    expect(longestDistanceAu([])).toBe(0);
    expect(longestDistanceAu([{ x: 1, y: 2, z: 3 }])).toBe(0);
  });
});

describe("sampleInfluence", () => {
  it("holds each reading until the next, null before the first", () => {
    const samples = sampleInfluence(
      [
        { at: T0 + 2 * HOUR, influence: 0.5 },
        { at: T0 + 30 * 60_000, influence: 0 },
      ],
      { now: T0 + 3 * HOUR, windowMs: 3 * HOUR, stepMs: HOUR },
    );
    expect(samples).toEqual([
      { at: T0, influence: null },
      { at: T0 + HOUR, influence: 0 },
      { at: T0 + 2 * HOUR, influence: 0.5 },
      { at: T0 + 3 * HOUR, influence: 0.5 },
    ]);
  });

  it("carries a reading from before the window into it", () => {
    const samples = sampleInfluence([{ at: T0 - DAY, influence: 0.8 }], {
      now: T0 + HOUR,
      windowMs: HOUR,
      stepMs: HOUR,
    });
    expect(samples.map((s) => s.influence)).toEqual([0.8, 0.8]);
  });
});

describe("highSecSpawnOutlook", () => {
  const ended = T0;

  it("says nothing while a high-sec incursion is up, or with nothing to count from", () => {
    expect(
      highSecSpawnOutlook({
        hasActiveHighSec: true,
        lastHighSecEndedAt: ended,
        now: ended + HOUR,
      }),
    ).toEqual({ kind: "none" });
    expect(
      highSecSpawnOutlook({
        hasActiveHighSec: false,
        lastHighSecEndedAt: undefined,
        now: ended,
      }),
    ).toEqual({ kind: "none" });
  });

  it("moves from blocked to expected to overdue", () => {
    const at = (now: number) =>
      highSecSpawnOutlook({
        hasActiveHighSec: false,
        lastHighSecEndedAt: ended,
        now,
      });
    expect(at(ended + HOUR)).toEqual({
      kind: "blocked",
      until: ended + 12 * HOUR,
    });
    expect(at(ended + 12 * HOUR)).toEqual({
      kind: "expected",
      until: ended + 36 * HOUR,
    });
    expect(at(ended + 40 * HOUR)).toEqual({
      kind: "overdue",
      since: ended + 36 * HOUR,
    });
  });
});
