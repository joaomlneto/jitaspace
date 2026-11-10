import { describe, expect, it } from "@jest/globals";

import { isBuildInHistoryScope } from "~/lib/history";
import { buildPlacement } from "~/lib/history-build-placement";

const sisi = (iso: string | null) => ({
  server: "singularity" as const,
  firstSeenAt: iso ? new Date(iso) : null,
});
const tq = (iso: string | null) => ({
  server: "tranquility" as const,
  firstSeenAt: iso ? new Date(iso) : null,
});

describe("buildPlacement", () => {
  it("places a build promoted from Singularity on Tranquility, dated by the promotion", () => {
    // Build 3682781: Singularity on 2026-11-09, Tranquility on 2026-11-10.
    const placed = buildPlacement([
      sisi("2026-11-09T00:00:00Z"),
      tq("2026-11-10T11:26:45Z"),
    ]);
    expect(placed).toEqual({
      server: "tranquility",
      releasedAt: new Date("2026-11-10T11:26:45Z"),
    });
    expect(isBuildInHistoryScope(placed.releasedAt, placed.server)).toBe(true);
  });

  it("keeps a build only Singularity has run on Singularity, out of scope", () => {
    const placed = buildPlacement([sisi("2026-11-06T00:00:00Z")]);
    expect(placed).toEqual({
      server: "singularity",
      releasedAt: new Date("2026-11-06T00:00:00Z"),
    });
    expect(isBuildInHistoryScope(placed.releasedAt, placed.server)).toBe(false);
  });

  it("places a Tranquility build on Tranquility, whatever the row order", () => {
    expect(buildPlacement([tq("2026-11-04T00:00:00Z")])).toEqual({
      server: "tranquility",
      releasedAt: new Date("2026-11-04T00:00:00Z"),
    });
    expect(
      buildPlacement([tq("2026-11-10T00:00:00Z"), sisi("2026-11-09T00:00:00Z")])
        .server,
    ).toBe("tranquility");
  });

  it("falls back to the first-seen date when the Tranquility row is undated", () => {
    expect(
      buildPlacement([tq(null), sisi("2026-11-09T00:00:00Z")]).releasedAt,
    ).toBeNull();
    // Undated sorts first (the package's rule), so the first-seen date is null
    // too; with a dated Singularity row and no undated one it is that date.
    expect(buildPlacement([tq(null)])).toEqual({
      server: "tranquility",
      releasedAt: null,
    });
  });

  it("has no server or date without deployments, which stays in scope", () => {
    const placed = buildPlacement([]);
    expect(placed).toEqual({ server: null, releasedAt: null });
    expect(buildPlacement(undefined)).toEqual(placed);
    expect(isBuildInHistoryScope(placed.releasedAt, placed.server)).toBe(true);
  });
});
