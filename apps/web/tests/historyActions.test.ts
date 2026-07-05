import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Type-only imports: erased at runtime, so they do NOT load the real (Prisma-
// backed) modules; used only to type the lazy require()s below.
import type * as HistoryActions from "~/lib/history-actions";
import type * as HistoryCache from "~/lib/history-cache";
// Pure (no Prisma) — safe to import eagerly, unlike the actions module.
import {
  HISTORY_MIN_RELEASE_DATE,
  isBuildInHistoryScope,
  netOp,
} from "~/lib/history";

// Exercises the query logic in ~/lib/history-actions (the change-history server
// functions) by stubbing @jitaspace/db-history so the real Prisma client is
// never loaded. Mutable fixtures are reassigned per-test; the stub closes over
// them by reference (mock-prefixed so the jest factory accepts them).

type ServerTag = "tranquility" | "singularity" | null;
let mockBuilds: {
  buildNumber: number;
  releasedAt: Date | null;
  server?: ServerTag;
}[] = [];
let mockCollections: { id: number; name: string }[] = [];
let mockGrouped: { diffId: number; collectionId: number; _count: number }[] =
  [];
let mockEntities: { kind: string; eveId: number }[] = [];
let mockDiffs: { id: number; fromBuild?: number | null; toBuild: number }[] =
  [];
let mockChangeRows: {
  op: "added" | "modified" | "removed";
  data: unknown;
  diffId: number;
  collection: { name: string };
  // Present only for the build-range reader (which selects the entity); the
  // per-entity timeline reader filters by entity in the query and never reads it.
  entity?: { kind: string; eveId: number };
}[] = [];
// fileChange.groupBy fixture (getResourceIndex's per-build file-change counts).
let mockFileAgg: {
  diffId: number;
  op: "added" | "modified" | "removed";
  _count: number;
}[] = [];
// build.findUnique fixture (the build-addressed readers' scope gate); null ⇒
// "build not found".
let mockBuildUnique: {
  buildNumber: number;
  releasedAt: Date | null;
  server?: ServerTag;
} | null = null;

jest.mock("@jitaspace/db-history", () => ({
  historyDb: {
    build: {
      findMany: () => Promise.resolve(mockBuilds),
      // Look the build up by number so readers that fetch two builds (from + to)
      // get distinct rows; fall back to the single mockBuildUnique fixture.
      findUnique: (args: { where: { buildNumber: number } }) => {
        const bn = args.where.buildNumber;
        if (mockBuildUnique?.buildNumber === bn)
          return Promise.resolve(mockBuildUnique);
        return Promise.resolve(
          mockBuilds.find((b) => b.buildNumber === bn) ?? null,
        );
      },
    },
    collection: { findMany: () => Promise.resolve(mockCollections) },
    change: {
      groupBy: () => Promise.resolve(mockGrouped),
      findMany: () => Promise.resolve(mockChangeRows),
    },
    entity: {
      // getCachedHistoryIndex counts entities per kind via groupBy; derive the
      // grouped shape from the flat mockEntities fixture.
      groupBy: () => {
        const counts = new Map<string, number>();
        for (const e of mockEntities)
          counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
        return Promise.resolve(
          [...counts].map(([kind, _count]) => ({ kind, _count })),
        );
      },
    },
    buildDiff: { findMany: () => Promise.resolve(mockDiffs) },
    fileChange: {
      groupBy: () => Promise.resolve(mockFileAgg),
      findMany: () => Promise.resolve([]),
    },
  },
}));

// getCachedHistoryIndex / getCachedEntityTimeline are "use cache" reads in
// ~/lib/history-cache, which call cacheLife() — a no-op outside the Next.js
// cache runtime, so stub it.
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  unstable_cacheLife: () => undefined,
}));

// Lazy-require after jest.mock: next/jest (SWC) does not hoist jest.mock, so a
// top-level import would load the real module before the stub is registered.
// The index is read straight from the cache module (no server-action wrapper);
// the build/entity readers live in history-actions.
const {
  getEntityTimeline,
  getBuildChanges,
  getBuildRangeChanges,
  getResourceIndex,
  getFileDiff,
} = require("~/lib/history-actions") as typeof HistoryActions;
const { getCachedHistoryIndex } =
  require("~/lib/history-cache") as typeof HistoryCache;

describe("isBuildInHistoryScope", () => {
  it("excludes builds released before the floor, includes the floor onward", () => {
    expect(isBuildInHistoryScope(new Date("2011-05-06"))).toBe(false);
    expect(isBuildInHistoryScope(new Date("2012-03-13"))).toBe(false);
    expect(
      isBuildInHistoryScope(new Date(`${HISTORY_MIN_RELEASE_DATE}T00:00:00Z`)),
    ).toBe(true);
    expect(isBuildInHistoryScope(new Date("2024-06-01"))).toBe(true);
  });

  it("treats an unknown (null) release date as in scope", () => {
    expect(isBuildInHistoryScope(null)).toBe(true);
    expect(isBuildInHistoryScope(undefined)).toBe(true);
  });

  it("accepts date strings, comparing on the YYYY-MM-DD prefix", () => {
    expect(isBuildInHistoryScope("2011-12-31T23:59:59Z")).toBe(false);
    expect(isBuildInHistoryScope(HISTORY_MIN_RELEASE_DATE)).toBe(true);
  });

  it("excludes test-server (Singularity) builds regardless of date", () => {
    expect(isBuildInHistoryScope(new Date("2024-06-01"), "singularity")).toBe(
      false,
    );
    // even an undated Singularity build is hidden (the null-date "in scope"
    // default does not rescue a test-server build)
    expect(isBuildInHistoryScope(null, "singularity")).toBe(false);
  });

  it("keeps Tranquility and SDE-backfill (null server) builds", () => {
    expect(isBuildInHistoryScope(new Date("2024-06-01"), "tranquility")).toBe(
      true,
    );
    expect(isBuildInHistoryScope(new Date("2024-06-01"), null)).toBe(true);
    expect(isBuildInHistoryScope(new Date("2024-06-01"), undefined)).toBe(true);
  });
});

describe("getCachedHistoryIndex", () => {
  beforeEach(() => {
    mockBuilds = [{ buildNumber: 100, releasedAt: new Date("2025-01-15") }];
    mockCollections = [
      { id: 1, name: "types" },
      { id: 2, name: "typeDogma" },
    ];
    mockEntities = [{ kind: "type", eveId: 587 }];
  });

  it("accumulates change counts across multiple diffs targeting the same build", async () => {
    // Two diffs both end at build 100 (e.g. an SDE backfill connected onto the
    // CDN era) and both touch the `types` collection.
    mockDiffs = [
      { id: 10, toBuild: 100 },
      { id: 11, toBuild: 100 },
    ];
    mockGrouped = [
      { diffId: 10, collectionId: 1, _count: 5 }, // types via diff 10
      { diffId: 11, collectionId: 1, _count: 3 }, // types via diff 11
      { diffId: 10, collectionId: 2, _count: 2 }, // typeDogma via diff 10
    ];

    const index = await getCachedHistoryIndex();
    const build = index.builds.find((b) => b.build === 100);

    // 5 + 3 must be summed, not overwritten to 3.
    expect(build?.byCollection).toEqual({ types: 8, typeDogma: 2 });
    expect(build?.changeCount).toBe(10);
    expect(build?.date).toBe("2025-01-15");
  });

  it("reports the per-collection counts for the single-diff case", async () => {
    mockDiffs = [{ id: 10, toBuild: 100 }];
    mockGrouped = [
      { diffId: 10, collectionId: 1, _count: 4 },
      { diffId: 10, collectionId: 2, _count: 1 },
    ];

    const index = await getCachedHistoryIndex();
    const build = index.builds.find((b) => b.build === 100);

    expect(build?.byCollection).toEqual({ types: 4, typeDogma: 1 });
    expect(build?.changeCount).toBe(5);
    expect(index.entityCountsByType).toEqual({ type: 1 });
  });

  it("excludes the pre-2012 baseline (build 80313) from the build list", async () => {
    mockBuilds = [
      { buildNumber: 80313, releasedAt: new Date("2011-05-06") }, // baseline
      { buildNumber: 600000, releasedAt: new Date(HISTORY_MIN_RELEASE_DATE) }, // on the floor
      { buildNumber: 700000, releasedAt: new Date("2024-06-01") },
      { buildNumber: 900000, releasedAt: null }, // undated ⇒ kept
    ];
    mockDiffs = [];
    mockGrouped = [];

    const index = await getCachedHistoryIndex();
    const builds = index.builds.map((b) => b.build);

    expect(builds).not.toContain(80313);
    expect(builds).toEqual([600000, 700000, 900000]);
  });

  it("excludes test-server (Singularity) builds, keeps Tranquility and SDE", async () => {
    mockBuilds = [
      {
        buildNumber: 700000,
        releasedAt: new Date("2024-06-01"),
        server: "tranquility",
      },
      {
        buildNumber: 700001,
        releasedAt: new Date("2024-06-02"),
        server: "singularity", // test server — must be hidden
      },
      { buildNumber: 700002, releasedAt: new Date("2024-06-03"), server: null }, // SDE
    ];
    mockDiffs = [];
    mockGrouped = [];

    const index = await getCachedHistoryIndex();
    const builds = index.builds.map((b) => b.build);

    expect(builds).not.toContain(700001);
    expect(builds).toEqual([700000, 700002]);
  });
});

describe("getEntityTimeline", () => {
  it("survives dangling FKs: null date when the Build row is missing, skips changes with no diff", async () => {
    // diff 10 → build 98 (present); diff 11 → build 99 (Build row missing);
    // diff 999 is absent entirely (dangling Change.diffId).
    mockDiffs = [
      { id: 10, fromBuild: 97, toBuild: 98 },
      { id: 11, fromBuild: 98, toBuild: 99 },
    ];
    mockBuilds = [{ buildNumber: 98, releasedAt: new Date("2024-01-01") }];
    mockChangeRows = [
      {
        op: "added",
        data: { typeName: "Rifter" },
        diffId: 10,
        collection: { name: "types" },
      },
      {
        // BuildDiff resolves, but its toBuild (99) has no Build row → null date,
        // yet the event must still render (build number comes from the diff map).
        op: "modified",
        data: { mass: { from: 1000, to: 1100 } },
        diffId: 11,
        collection: { name: "types" },
      },
      {
        // The change's BuildDiff is gone entirely → can't place it; drop it.
        op: "removed",
        data: {},
        diffId: 999,
        collection: { name: "types" },
      },
    ];

    const timeline = await getEntityTimeline("type", 587);

    expect(timeline?.events).toEqual([
      {
        build: 98,
        date: "2024-01-01",
        collection: "types",
        fromBuild: 97,
        server: null,
        provenance: "sde",
        v: 1,
        kind: "added",
        values: { typeName: "Rifter" },
      },
      {
        build: 99,
        date: null,
        collection: "types",
        fromBuild: 98,
        server: null,
        provenance: "sde",
        v: 1,
        kind: "modified",
        fields: { mass: { from: 1000, to: 1100 } },
      },
    ]);
  });

  it("drops events on the pre-2012 baseline build but keeps in-scope ones", async () => {
    // diff 10 → build 80313 (pre-floor, e.g. the baseline "added"); diff 11 →
    // build 700000 (in scope).
    mockDiffs = [
      { id: 10, fromBuild: null, toBuild: 80313 },
      { id: 11, fromBuild: 690000, toBuild: 700000 },
    ];
    mockBuilds = [
      { buildNumber: 80313, releasedAt: new Date("2011-05-06") },
      { buildNumber: 700000, releasedAt: new Date("2024-06-01") },
    ];
    mockChangeRows = [
      {
        op: "added",
        data: { typeName: "Rifter" },
        diffId: 10,
        collection: { name: "types" },
      },
      {
        op: "modified",
        data: { mass: { from: 1000, to: 1100 } },
        diffId: 11,
        collection: { name: "types" },
      },
    ];

    const timeline = await getEntityTimeline("type", 587);

    expect(timeline?.events).toEqual([
      {
        build: 700000,
        date: "2024-06-01",
        collection: "types",
        fromBuild: 690000,
        server: null,
        provenance: "sde",
        v: 1,
        kind: "modified",
        fields: { mass: { from: 1000, to: 1100 } },
      },
    ]);
  });

  it("returns null when an entity's only changes are on out-of-scope builds", async () => {
    mockDiffs = [{ id: 10, toBuild: 80313 }];
    mockBuilds = [{ buildNumber: 80313, releasedAt: new Date("2011-05-06") }];
    mockChangeRows = [
      {
        op: "added",
        data: { typeName: "Rifter" },
        diffId: 10,
        collection: { name: "types" },
      },
    ];

    expect(await getEntityTimeline("type", 587)).toBeNull();
  });

  it("drops events on test-server (Singularity) builds, keeps Tranquility ones", async () => {
    // diff 10 → build 700000 (Tranquility); diff 11 → build 700001 (Singularity)
    mockDiffs = [
      { id: 10, fromBuild: 690000, toBuild: 700000 },
      { id: 11, fromBuild: 700000, toBuild: 700001 },
    ];
    mockBuilds = [
      {
        buildNumber: 700000,
        releasedAt: new Date("2024-06-01"),
        server: "tranquility",
      },
      {
        buildNumber: 700001,
        releasedAt: new Date("2024-06-02"),
        server: "singularity",
      },
    ];
    mockChangeRows = [
      {
        op: "added",
        data: { typeName: "Rifter" },
        diffId: 10,
        collection: { name: "types" },
      },
      {
        op: "modified",
        data: { mass: { from: 1000, to: 1100 } },
        diffId: 11,
        collection: { name: "types" },
      },
    ];

    const timeline = await getEntityTimeline("type", 587);

    expect(timeline?.events).toEqual([
      {
        build: 700000,
        date: "2024-06-01",
        collection: "types",
        fromBuild: 690000,
        server: "tranquility",
        provenance: "sde",
        v: 1,
        kind: "added",
        values: { typeName: "Rifter" },
      },
    ]);
  });

  it("annotates events with the diff's from-build, server, and provenance", async () => {
    // diff 20 carries resource-file changes ⇒ "resource-server"; diff 21 has
    // none ⇒ "sde". Each event also gets its diff's fromBuild and its build's
    // server.
    mockDiffs = [
      { id: 20, fromBuild: 690000, toBuild: 700000 },
      { id: 21, fromBuild: 700000, toBuild: 700001 },
    ];
    mockBuilds = [
      {
        buildNumber: 700000,
        releasedAt: new Date("2024-06-01"),
        server: "tranquility",
      },
      { buildNumber: 700001, releasedAt: new Date("2024-06-02"), server: null }, // SDE
    ];
    mockFileAgg = [{ diffId: 20, op: "added", _count: 4 }]; // only diff 20 has res files
    mockChangeRows = [
      {
        op: "modified",
        data: { mass: { from: 1, to: 2 } },
        diffId: 20,
        collection: { name: "types" },
      },
      {
        op: "added",
        data: { typeName: "Ibis" },
        diffId: 21,
        collection: { name: "types" },
      },
    ];

    const timeline = await getEntityTimeline("type", 587);

    expect(timeline?.events).toEqual([
      {
        build: 700000,
        date: "2024-06-01",
        collection: "types",
        fromBuild: 690000,
        server: "tranquility",
        provenance: "resource-server",
        v: 1,
        kind: "modified",
        fields: { mass: { from: 1, to: 2 } },
      },
      {
        build: 700001,
        date: "2024-06-02",
        collection: "types",
        fromBuild: 700000,
        server: null,
        provenance: "sde",
        v: 1,
        kind: "added",
        values: { typeName: "Ibis" },
      },
    ]);

    mockFileAgg = []; // reset for subsequent suites
  });
});

describe("getBuildChanges", () => {
  it("returns null for the pre-2012 baseline build (80313)", async () => {
    mockBuildUnique = {
      buildNumber: 80313,
      releasedAt: new Date("2011-05-06"),
    };

    expect(await getBuildChanges(80313)).toBeNull();
  });

  it("returns null for a test-server (Singularity) build", async () => {
    mockBuildUnique = {
      buildNumber: 700001,
      releasedAt: new Date("2024-06-02"),
      server: "singularity",
    };

    expect(await getBuildChanges(700001)).toBeNull();
  });
});

describe("getResourceIndex", () => {
  it("excludes test-server (Singularity) builds from the resource index", async () => {
    mockBuilds = [
      {
        buildNumber: 700000,
        releasedAt: new Date("2024-06-01"),
        server: "tranquility",
      },
      {
        buildNumber: 700001,
        releasedAt: new Date("2024-06-02"),
        server: "singularity",
      },
    ];
    mockDiffs = [
      { id: 10, toBuild: 700000 },
      { id: 11, toBuild: 700001 },
    ];
    // Both builds have file changes; only the Tranquility one should survive.
    mockFileAgg = [
      { diffId: 10, op: "added", _count: 3 },
      { diffId: 11, op: "added", _count: 5 },
    ];
    mockCollections = []; // no string collections
    mockGrouped = []; // no string changes

    const index = await getResourceIndex();
    const builds = index.builds.map((b) => b.build);

    expect(builds).toEqual([700000]);
    expect(builds).not.toContain(700001);
  });
});

describe("getFileDiff", () => {
  it("returns null for a test-server (Singularity) build (scope gate)", async () => {
    mockBuildUnique = {
      buildNumber: 700001,
      releasedAt: new Date("2024-06-02"),
      server: "singularity",
    };

    expect(await getFileDiff(700001)).toBeNull();
  });
});

describe("netOp", () => {
  it("folds an op sequence to its net effect across a range", () => {
    expect(netOp(["added"])).toBe("added");
    expect(netOp(["modified"])).toBe("modified");
    expect(netOp(["removed"])).toBe("removed");
    // added then later touched ⇒ still net-new at the endpoint
    expect(netOp(["added", "modified"])).toBe("added");
    // existed, then removed ⇒ net removed
    expect(netOp(["modified", "removed"])).toBe("removed");
    // existed (removed implies it was there), later re-added ⇒ net modified
    expect(netOp(["removed", "added"])).toBe("modified");
    expect(netOp(["modified", "modified"])).toBe("modified");
  });

  it("returns null for a transient entity or an empty sequence", () => {
    expect(netOp(["added", "removed"])).toBeNull();
    expect(netOp(["added", "modified", "removed"])).toBeNull();
    expect(netOp([])).toBeNull();
  });
});

describe("getBuildRangeChanges", () => {
  const tq = (n: number, d: string) => ({
    buildNumber: n,
    releasedAt: new Date(d),
    server: "tranquility" as const,
  });
  const row = (
    op: "added" | "modified" | "removed",
    diffId: number,
    kind: string,
    eveId: number,
    collection = "types",
  ) => ({
    op,
    data: {},
    diffId,
    collection: { name: collection },
    entity: { kind, eveId },
  });

  it("folds every change in (from, to] into a net op per entity", async () => {
    mockBuildUnique = null;
    mockBuilds = [
      tq(700000, "2024-06-01"),
      tq(700001, "2024-06-02"),
      tq(700002, "2024-06-03"),
      tq(700003, "2024-06-04"),
    ];
    mockDiffs = [
      { id: 31, toBuild: 700001 },
      { id: 32, toBuild: 700002 },
      { id: 33, toBuild: 700003 },
    ];
    mockChangeRows = [
      row("modified", 31, "type", 587), // 587: modified …
      row("modified", 33, "type", 587), // … then modified ⇒ net modified
      row("added", 32, "type", 588), // 588: added ⇒ net added
      row("added", 31, "type", 589), // 589: added …
      row("removed", 33, "type", 589), // … then removed ⇒ transient, dropped
      row("removed", 32, "type", 590, "typeDogma"), // 590/typeDogma: net removed
    ];

    const result = await getBuildRangeChanges(700000, 700003);
    expect(result).not.toBeNull();
    expect(result?.from).toBe(700000);
    expect(result?.to).toBe(700003);
    expect(result?.fromDate).toBe("2024-06-01");
    expect(result?.toDate).toBe("2024-06-04");

    const find = (id: number, collection: string) =>
      result?.changes.find(
        (c) => c.entityId === id && c.collection === collection,
      );
    expect(find(587, "types")?.kind).toBe("modified");
    expect(find(588, "types")?.kind).toBe("added");
    expect(find(590, "typeDogma")?.kind).toBe("removed");
    expect(find(589, "types")).toBeUndefined(); // transient
    expect(result?.changes).toHaveLength(3);
  });

  it("returns null for from >= to, a missing endpoint, or an out-of-scope endpoint", async () => {
    mockBuildUnique = null;
    mockBuilds = [
      tq(700000, "2024-06-01"),
      tq(700003, "2024-06-04"),
      {
        buildNumber: 700004,
        releasedAt: new Date("2024-06-05"),
        server: "singularity",
      },
    ];

    expect(await getBuildRangeChanges(700003, 700000)).toBeNull(); // from >= to
    expect(await getBuildRangeChanges(700000.5, 700003)).toBeNull(); // non-integer
    expect(await getBuildRangeChanges(700000, 999999)).toBeNull(); // to missing
    expect(await getBuildRangeChanges(700000, 700004)).toBeNull(); // to is Singularity
  });

  it("skips changes on out-of-scope intermediate builds (Singularity)", async () => {
    mockBuildUnique = null;
    mockBuilds = [
      tq(700000, "2024-06-01"),
      {
        buildNumber: 700001,
        releasedAt: new Date("2024-06-02"),
        server: "singularity",
      },
      tq(700002, "2024-06-03"),
    ];
    mockDiffs = [
      { id: 41, toBuild: 700001 }, // Singularity build in range
      { id: 42, toBuild: 700002 },
    ];
    mockChangeRows = [
      row("added", 41, "type", 700), // on the Singularity build ⇒ excluded
      row("modified", 42, "type", 701),
    ];

    const result = await getBuildRangeChanges(700000, 700002);
    expect(result?.changes.map((c) => c.entityId)).toEqual([701]);
  });
});
