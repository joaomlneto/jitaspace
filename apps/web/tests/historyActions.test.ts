import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

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
// change.groupBy fixture (getCachedHistoryIndex's per-build change volume).
let mockGrouped: {
  diffId: number;
  collectionId: number;
  _count: number;
}[] = [];
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
// fileChange.groupBy fixture (getCachedEntityTimeline's resource-server
// provenance: which diffs carry file changes).
let mockFileAgg: {
  diffId: number;
  op: "added" | "modified" | "removed";
  _count: number;
}[] = [];
// $queryRaw fixture: one aggregated (entity, collection) row per changed entity
// for the build-range reader (op at the earliest + latest build in the range).
let mockRangeRows: {
  entityType: string;
  entityId: number | string;
  collection: string;
  firstOp: string;
  lastOp: string;
}[] = [];
// build.findUnique fixture (the build-addressed readers' scope gate); null ⇒
// "build not found".
let mockBuildUnique: {
  buildNumber: number;
  releasedAt: Date | null;
  server?: ServerTag;
} | null = null;

// Vercel BotID verdict for the guards at the top of every action. Real
// classification needs the headers BotID's client script attaches, so stub it
// and flip the verdict per test: local development always classifies as human,
// which would otherwise leave the refusal branch — the actual security control —
// unreachable. `mock`-prefixed so the jest factory may close over it.
let mockIsBot = false;
// Counts every historyDb (and type-name) access, to prove the guard refuses
// before touching a database rather than after doing the expensive work.
let mockDbCalls = 0;

// prisma.type.findMany fixture — our own SDE tables, which the build-range
// reader queries for the changed types' names. The stub honours the `in` filter,
// so an id with no row is absent from the result, as in the real query. Each
// call's id list is recorded, and `mockTypeNamesFail` makes the read reject.
let mockTypeRows: { typeId: number; name: string }[] = [];
let mockTypeNamesFail = false;
let mockTypeQueries: number[][] = [];
// A failed names read degrades the comparison but is reported, not hidden.
const mockCaptureException = jest.fn();

jest.mock("botid/server", () => ({
  checkBotId: () => Promise.resolve({ isBot: mockIsBot }),
}));

jest.mock("@sentry/nextjs", () => ({
  captureException: (error: unknown, context?: unknown) =>
    mockCaptureException(error, context),
}));

jest.mock("~/lib/db", () => ({
  prisma: {
    type: {
      findMany: (args: { where: { typeId: { in: number[] } } }) => {
        mockDbCalls++;
        const ids = args.where.typeId.in;
        mockTypeQueries.push(ids);
        if (mockTypeNamesFail)
          return Promise.reject(new Error("Too many database connections"));
        return Promise.resolve(
          mockTypeRows.filter((r) => ids.includes(r.typeId)),
        );
      },
    },
  },
}));

jest.mock("@jitaspace/db-history", () => ({
  historyDb: {
    build: {
      findMany: () => {
        mockDbCalls++;
        return Promise.resolve(mockBuilds);
      },
      // Look the build up by number so readers that fetch two builds (from + to)
      // get distinct rows; fall back to the single mockBuildUnique fixture.
      findUnique: (args: { where: { buildNumber: number } }) => {
        mockDbCalls++;
        const bn = args.where.buildNumber;
        if (mockBuildUnique?.buildNumber === bn)
          return Promise.resolve(mockBuildUnique);
        return Promise.resolve(
          mockBuilds.find((b) => b.buildNumber === bn) ?? null,
        );
      },
    },
    collection: {
      findMany: () => {
        mockDbCalls++;
        return Promise.resolve(mockCollections);
      },
    },
    change: {
      groupBy: () => {
        mockDbCalls++;
        return Promise.resolve(mockGrouped);
      },
      findMany: () => {
        mockDbCalls++;
        return Promise.resolve(mockChangeRows);
      },
    },
    entity: {
      // getCachedHistoryIndex counts entities per kind via groupBy; derive the
      // grouped shape from the flat mockEntities fixture.
      groupBy: () => {
        mockDbCalls++;
        const counts = new Map<string, number>();
        for (const e of mockEntities)
          counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
        return Promise.resolve(
          [...counts].map(([kind, _count]) => ({ kind, _count })),
        );
      },
    },
    buildDiff: {
      findMany: () => {
        mockDbCalls++;
        return Promise.resolve(mockDiffs);
      },
    },
    fileChange: {
      groupBy: () => {
        mockDbCalls++;
        return Promise.resolve(mockFileAgg);
      },
    },
    // The build-range reader aggregates in one raw SQL query.
    $queryRaw: () => {
      mockDbCalls++;
      return Promise.resolve(mockRangeRows);
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
// the build-range/entity readers live in history-actions.
const { getEntityTimeline, getBuildRangeChanges } =
  require("~/lib/history-actions") as typeof HistoryActions;
const { getCachedBuildRangeChanges, getCachedHistoryIndex } =
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
  // One aggregated row per (entity, collection): the op at the earliest and the
  // latest in-scope build in the range, as the DB query returns it.
  const agg = (
    entityType: string,
    entityId: number | string,
    collection: string,
    firstOp: string,
    lastOp: string,
  ) => ({ entityType, entityId, collection, firstOp, lastOp });

  it("folds the DB's first/last op per entity into a net op", async () => {
    mockBuildUnique = null;
    mockBuilds = [tq(700000, "2024-06-01"), tq(700003, "2024-06-04")];
    mockRangeRows = [
      agg("type", 587, "types", "modified", "modified"), // net modified
      agg("type", "588", "types", "added", "added"), // net added (id as string)
      agg("type", 589, "types", "added", "removed"), // transient -> dropped
      agg("type", 590, "typeDogma", "removed", "removed"), // net removed
    ];

    const result = await getBuildRangeChanges(700000, 700003);
    expect(result?.from).toBe(700000);
    expect(result?.to).toBe(700003);
    expect(result?.fromDate).toBe("2024-06-01");
    expect(result?.toDate).toBe("2024-06-04");

    const find = (id: number, collection: string) =>
      result?.changes.find(
        (c) => c.entityId === id && c.collection === collection,
      );
    expect(find(587, "types")?.kind).toBe("modified");
    expect(find(588, "types")?.kind).toBe("added"); // string id coerced to number
    expect(find(590, "typeDogma")?.kind).toBe("removed");
    expect(find(589, "types")).toBeUndefined(); // transient dropped
    expect(result?.changes).toHaveLength(3);
  });

  it("returns null for from >= to, a non-integer, or a missing/out-of-scope endpoint", async () => {
    mockBuildUnique = null;
    mockRangeRows = [];
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

  it("returns an empty change list when the endpoints exist but nothing changed", async () => {
    mockBuildUnique = null;
    mockBuilds = [tq(700000, "2024-06-01"), tq(700003, "2024-06-04")];
    mockRangeRows = []; // the aggregation found nothing in the range

    const result = await getBuildRangeChanges(700000, 700003);
    expect(result).not.toBeNull();
    expect(result?.changes).toEqual([]);
    expect(result?.fromDate).toBe("2024-06-01");
    expect(result?.toDate).toBe("2024-06-04");
  });

  describe("type names", () => {
    beforeEach(() => {
      mockBuildUnique = null;
      mockBuilds = [tq(700000, "2024-06-01"), tq(700003, "2024-06-04")];
      mockRangeRows = [
        agg("type", 587, "types", "modified", "modified"),
        agg("type", 587, "typeDogma", "modified", "modified"), // same type again
        agg("type", "588", "types", "added", "added"), // id as string
        agg("type", 589, "types", "added", "removed"), // transient -> dropped
        agg("type", 591, "types", "added", "added"), // newer than our SDE
        agg("type", 592, "types", "modified", "modified"), // blank name
        agg("skin", 587, "skins", "added", "added"), // not a type, same id
      ];
      mockTypeRows = [
        { typeId: 587, name: "Rifter" },
        { typeId: 588, name: "Slasher" },
        { typeId: 589, name: "Breacher" },
        { typeId: 592, name: "  " },
      ];
      mockTypeNamesFail = false;
      mockTypeQueries = [];
      mockCaptureException.mockClear();
    });

    it("names every type in the net result in a single query", async () => {
      const result = await getBuildRangeChanges(700000, 700003);

      // One query for all of them — the per-row lookups this replaces queued a
      // server action per type. Each type id is asked for once: not the
      // transient 589, and not the skin that shares 587's id.
      expect(mockTypeQueries).toEqual([[587, 588, 591, 592]]);
      // Unknown and blank names are left out; those rows fall back to the id.
      expect(result?.typeNames).toEqual({ 587: "Rifter", 588: "Slasher" });
      expect(result?.changes).toHaveLength(6);
    });

    it("keeps the names out of the permanent range entry", async () => {
      // The range entry is `cacheLife("max")` — a pair of past builds never
      // differs — but names change when the SDE is re-ingested, so a name baked
      // in there would be frozen for good. The entry itself carries none...
      const cached = await getCachedBuildRangeChanges(700000, 700003);
      expect(cached).not.toBeNull();
      expect(cached).not.toHaveProperty("typeNames");
      expect(mockTypeQueries).toEqual([]);

      // ...and the action reads them afresh each time, so a rename shows up.
      await getBuildRangeChanges(700000, 700003);
      mockTypeRows = [{ typeId: 587, name: "Rifter II" }];
      const renamed = await getBuildRangeChanges(700000, 700003);
      expect(renamed?.typeNames).toEqual({ 587: "Rifter II" });
      expect(mockTypeQueries).toHaveLength(2);
    });

    it("still serves the comparison when the names cannot be read, and reports it", async () => {
      mockTypeNamesFail = true;

      const result = await getBuildRangeChanges(700000, 700003);
      expect(result?.changes).toHaveLength(6);
      expect(result?.typeNames).toBeUndefined();
      expect(mockCaptureException).toHaveBeenCalledTimes(1);
    });

    it("skips the names query when no type changed", async () => {
      mockRangeRows = [agg("skin", 1, "skins", "added", "added")];

      const result = await getBuildRangeChanges(700000, 700003);
      expect(mockTypeQueries).toEqual([]);
      expect(result?.typeNames).toEqual({});
    });
  });
});

describe("BotID gate", () => {
  // In-scope Tranquility build (the sibling describe's helper is scoped to it).
  const tqBuild = (n: number, d: string) => ({
    buildNumber: n,
    releasedAt: new Date(d),
    server: "tranquility" as const,
  });

  // getBuildRangeChanges is unauthenticated and expensive — heavy range SQL
  // that mints a `cacheLife("max")` entry per pair — so it opens with
  // `checkBotId()`. Local development always classifies as human, so without
  // the stub above this branch would never execute.
  //
  // `getEntityTimeline` is intentionally unguarded: guarding it would force
  // `/type/*` into the BotID protect list (see instrumentation-client.ts). The
  // last test here pins that.
  //
  // The fixtures are seeded so a HUMAN caller gets a non-null result; without
  // that, the refusal assertion would pass with the guard deleted.
  beforeEach(() => {
    mockIsBot = true;
    mockDbCalls = 0;
    mockBuildUnique = null;
    mockBuilds = [tqBuild(700000, "2024-06-01"), tqBuild(700003, "2024-06-04")];
    mockDiffs = [{ id: 10, toBuild: 700003 }];
    mockChangeRows = [
      {
        op: "added",
        data: {},
        diffId: 10,
        collection: { name: "types" },
      },
    ];
    mockRangeRows = [];
  });

  afterEach(() => {
    mockIsBot = false;
  });

  it("refuses getBuildRangeChanges to a bot, and serves it to a human", async () => {
    expect(await getBuildRangeChanges(700000, 700003)).toBeNull();

    mockIsBot = false;
    expect(await getBuildRangeChanges(700000, 700003)).not.toBeNull();
  });

  it("refuses before touching the history database", async () => {
    await getBuildRangeChanges(700000, 700003);
    // The whole point of the guard: a bot costs us nothing. Every stubbed
    // historyDb method increments this counter, so a query on any path trips it.
    expect(mockDbCalls).toBe(0);

    // ...and a human does reach the database, so the counter is wired up.
    mockIsBot = false;
    await getBuildRangeChanges(700000, 700003);
    expect(mockDbCalls).toBeGreaterThan(0);
  });

  it("leaves getEntityTimeline unguarded so /type/* need not be protected", async () => {
    // Guarding this would drag the busiest route family into the protect list,
    // which intercepts every Server Action fired from those pages — including
    // the root layout's EVE token refresh.
    expect(await getEntityTimeline("type", 587)).not.toBeNull();
    expect(mockDbCalls).toBeGreaterThan(0);
  });
});
