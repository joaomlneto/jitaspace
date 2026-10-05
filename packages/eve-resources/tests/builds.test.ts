import { describe, expect, it } from "@jest/globals";

import {
  BUILD_DATES,
  BUILD_TIMESTAMPS,
  CCP_SERVERS,
  KNOWN_BUILDS,
} from "../src/index";

const allKnown = new Set(Object.values(KNOWN_BUILDS).flat());

describe("KNOWN_BUILDS", () => {
  it("lists builds for exactly the CCP-operated servers", () => {
    expect(Object.keys(KNOWN_BUILDS).sort()).toEqual([...CCP_SERVERS].sort());
  });

  it.each(CCP_SERVERS)(
    "%s: strictly ascending, positive integers",
    (server) => {
      const builds = KNOWN_BUILDS[server];
      expect(builds.length).toBeGreaterThan(0);
      for (const [i, build] of builds.entries()) {
        expect(Number.isInteger(build) && build > 0).toBe(true);
        if (i > 0) expect(build).toBeGreaterThan(builds[i - 1] ?? 0);
      }
    },
  );
});

describe("BUILD_DATES", () => {
  it("maps known builds to YYYY-MM-DD dates", () => {
    for (const [build, date] of Object.entries(BUILD_DATES)) {
      expect(allKnown.has(Number(build))).toBe(true);
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(date ?? ""))).toBe(false);
    }
  });
});

describe("BUILD_TIMESTAMPS", () => {
  it("maps known builds to ISO-8601 UTC timestamps", () => {
    for (const [build, ts] of Object.entries(BUILD_TIMESTAMPS)) {
      expect(allKnown.has(Number(build))).toBe(true);
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(new Date(ts ?? "").toISOString().slice(0, 19)).toBe(
        ts?.slice(0, 19),
      );
    }
  });
});
