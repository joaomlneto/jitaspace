import { describe, expect, it } from "@jest/globals";

import type { BuildDigest } from "../jobs/summarize/digest";
import { formatBuildDigest, SAMPLE_LIMIT } from "../jobs/summarize/digest";
import {
  MAX_SUMMARY_LENGTH,
  validateSummary,
} from "../jobs/summarize/summarize";
import { lowestBaseline } from "../jobs/summarize/summarizeBuilds";

const digest = (overrides: Partial<BuildDigest> = {}): BuildDigest => ({
  build: 3401877,
  date: "2026-08-19",
  fromBuild: 3389104,
  counts: [],
  samples: [],
  ...overrides,
});

describe("formatBuildDigest", () => {
  it("heads the digest with the build, its date and its baseline", () => {
    const text = formatBuildDigest(
      digest({
        counts: [{ collection: "types", added: 2, modified: 0, removed: 0 }],
      }),
    );
    expect(text.split("\n")[0]).toBe(
      "EVE client build 3401877, released 2026-08-19, compared with build 3389104.",
    );
  });

  it("marks a genesis build rather than claiming a baseline", () => {
    const text = formatBuildDigest(
      digest({
        fromBuild: null,
        counts: [{ collection: "types", added: 1, modified: 0, removed: 0 }],
      }),
    );
    expect(text).toContain("(first recorded build)");
    expect(text).not.toContain("compared with");
  });

  it("omits the date when the build has none", () => {
    const text = formatBuildDigest(
      digest({
        date: null,
        counts: [{ collection: "types", added: 1, modified: 0, removed: 0 }],
      }),
    );
    expect(text.split("\n")[0]).toBe(
      "EVE client build 3401877, compared with build 3389104.",
    );
  });

  it("ranks collections by how much they changed", () => {
    const text = formatBuildDigest(
      digest({
        counts: [
          { collection: "marketGroups", added: 0, modified: 12, removed: 0 },
          { collection: "types", added: 102, modified: 609, removed: 101 },
          { collection: "skins", added: 208, modified: 0, removed: 0 },
        ],
      }),
    );
    const order = text
      .split("\n")
      .filter((l) => /^[a-zA-Z]+:/.test(l))
      .map((l) => l.split(":")[0]);
    expect(order).toEqual(["types", "skins", "marketGroups"]);
  });

  it("writes only the non-zero tallies", () => {
    const text = formatBuildDigest(
      digest({
        counts: [{ collection: "skins", added: 208, modified: 0, removed: 0 }],
      }),
    );
    expect(text).toContain("skins: 208 new");
    expect(text).not.toContain("changed");
    expect(text).not.toContain("removed");
  });

  it("drops collections with nothing in them", () => {
    const text = formatBuildDigest(
      digest({
        counts: [
          { collection: "types", added: 1, modified: 0, removed: 0 },
          { collection: "icons", added: 0, modified: 0, removed: 0 },
        ],
      }),
    );
    expect(text).not.toContain("icons");
  });

  it("says so plainly when a build changed nothing", () => {
    expect(formatBuildDigest(digest())).toContain(
      "Nothing changed in this build.",
    );
  });

  it("includes sampled names and caps how many it lists", () => {
    const names = Array.from(
      { length: SAMPLE_LIMIT + 5 },
      (_, i) => `Ship ${i + 1}`,
    );
    const text = formatBuildDigest(
      digest({
        counts: [
          { collection: "types", added: names.length, modified: 0, removed: 0 },
        ],
        samples: [{ collection: "types", op: "added", names }],
      }),
    );
    expect(text).toContain("added: Ship 1, Ship 2");
    expect(text).toContain("and 5 more");
    expect(text).not.toContain(`Ship ${SAMPLE_LIMIT + 1},`);
  });
});

describe("validateSummary", () => {
  it("collapses whitespace and trims", () => {
    expect(validateSummary("  Adds   four\nships. ")).toBe("Adds four ships.");
  });

  it("rejects an empty or missing summary", () => {
    expect(validateSummary("   ")).toBeNull();
    expect(validateSummary("")).toBeNull();
    expect(validateSummary(null)).toBeNull();
    expect(validateSummary(undefined)).toBeNull();
  });

  it("rejects anything past the length ceiling rather than truncating mid-sentence", () => {
    expect(validateSummary("a".repeat(MAX_SUMMARY_LENGTH))).toHaveLength(
      MAX_SUMMARY_LENGTH,
    );
    expect(validateSummary("a".repeat(MAX_SUMMARY_LENGTH + 1))).toBeNull();
  });
});

describe("lowestBaseline", () => {
  it("picks the lowest real baseline", () => {
    expect(
      lowestBaseline([{ fromBuild: 3389104 }, { fromBuild: 3376632 }]),
    ).toBe(3376632);
  });

  it("ignores a genesis diff whichever order it arrives in", () => {
    // `buildDiff.findMany` has no `orderBy`, so both orders must agree.
    const rows = [{ fromBuild: null }, { fromBuild: 3389104 }];
    expect(lowestBaseline(rows)).toBe(3389104);
    expect(lowestBaseline([...rows].reverse())).toBe(3389104);
  });

  it("reports a genesis build only when no real baseline exists", () => {
    expect(lowestBaseline([{ fromBuild: null }])).toBeNull();
    expect(lowestBaseline([])).toBeNull();
  });
});
