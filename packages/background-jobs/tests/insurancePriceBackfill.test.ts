import { describe, expect, it } from "@jest/globals";

import {
  dayPaths,
  findObservationGaps,
  groupIntoRuns,
} from "../helpers/insurancePriceBackfill.ts";
import { observedAtFromLastModified } from "../helpers/planInsurancePriceUpdates.ts";

const at = (hour: number) => new Date(Date.UTC(2026, 9, 10, hour));
const file = (hour: number, etag: string) => ({
  url: `https://data.everef.net/${hour}.json.bz2`,
  etag,
  observedAt: at(hour),
});
const hoursOf = (runs: ReturnType<typeof groupIntoRuns>) =>
  runs.map((run) => run.map((f) => f.observedAt.getUTCHours()));

describe("groupIntoRuns", () => {
  it("groups consecutive files with the same contents", () => {
    const runs = groupIntoRuns(
      [file(1, "a"), file(2, "a"), file(3, "b"), file(4, "a")],
      [],
    );
    expect(hoursOf(runs)).toEqual([[1, 2], [3], [4]]);
  });

  it("splits a run at an observation already recorded", () => {
    const runs = groupIntoRuns(
      [file(1, "a"), file(2, "a"), file(4, "a")],
      [at(3)],
    );
    expect(hoursOf(runs)).toEqual([[1, 2], [4]]);
  });

  it("keeps one file per time", () => {
    const runs = groupIntoRuns([file(1, "a"), file(1, "a"), file(2, "a")], []);
    expect(hoursOf(runs)).toEqual([[1, 2]]);
  });

  it("skips files already recorded", () => {
    const runs = groupIntoRuns([file(1, "a"), file(2, "a")], [at(1)]);
    expect(hoursOf(runs)).toEqual([[2]]);
  });
});

describe("dayPaths", () => {
  it("lists every UTC day in the range, across a year", () => {
    expect(
      dayPaths(
        new Date("2025-12-31T23:50:00Z"),
        new Date("2026-01-02T00:10:00Z"),
      ),
    ).toEqual(["2025/2025-12-31", "2026/2026-01-01", "2026/2026-01-02"]);
  });
});

describe("observedAtFromLastModified", () => {
  const now = new Date("2026-10-10T20:03:28Z");

  it("reads ESI's Last-Modified", () => {
    expect(
      observedAtFromLastModified("Sat, 10 Oct 2026 19:31:33 GMT", now),
    ).toEqual(new Date("2026-10-10T19:31:33Z"));
  });

  it("falls back to now when it is missing, invalid or in the future", () => {
    expect(observedAtFromLastModified(undefined, now)).toBe(now);
    expect(observedAtFromLastModified("yesterday-ish", now)).toBe(now);
    expect(
      observedAtFromLastModified("Sun, 11 Oct 2026 19:31:33 GMT", now),
    ).toBe(now);
  });
});

describe("findObservationGaps", () => {
  const minutes = (m: number) => new Date(Date.UTC(2026, 9, 10, 0, m));

  it("finds stretches of over 90 minutes, up to now", () => {
    expect(
      findObservationGaps(
        [minutes(60), minutes(0), minutes(250)],
        minutes(400),
      ),
    ).toEqual([
      { from: minutes(60), to: minutes(250) },
      { from: minutes(250), to: minutes(400) },
    ]);
  });

  it("finds none in hourly observations", () => {
    expect(
      findObservationGaps(
        [minutes(0), minutes(61), minutes(122)],
        minutes(150),
      ),
    ).toEqual([]);
  });
});
