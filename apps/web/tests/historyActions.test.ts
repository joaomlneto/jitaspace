import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Type-only import: erased at runtime, so it does NOT load the real (Prisma-
// backed) module; used only to type the lazy require() below.
import type * as HistoryActions from "~/lib/history-actions";

// Exercises the query logic in ~/lib/history-actions (the change-history server
// functions) by stubbing @jitaspace/db-history so the real Prisma client is
// never loaded. Mutable fixtures are reassigned per-test; the stub closes over
// them by reference (mock-prefixed so the jest factory accepts them).

let mockBuilds: { buildNumber: number; releasedAt: Date | null }[] = [];
let mockCollections: { id: number; name: string }[] = [];
let mockGrouped: { diffId: number; collectionId: number; _count: number }[] =
  [];
let mockEntities: { kind: string; eveId: number }[] = [];
let mockDiffs: { id: number; toBuild: number }[] = [];
let mockChangeRows: {
  op: "added" | "modified" | "removed";
  data: unknown;
  diffId: number;
  collection: { name: string };
}[] = [];

jest.mock("@jitaspace/db-history", () => ({
  historyDb: {
    build: {
      findMany: () => Promise.resolve(mockBuilds),
      findUnique: () => Promise.resolve(null),
    },
    collection: { findMany: () => Promise.resolve(mockCollections) },
    change: {
      groupBy: () => Promise.resolve(mockGrouped),
      findMany: () => Promise.resolve(mockChangeRows),
    },
    entity: { findMany: () => Promise.resolve(mockEntities) },
    buildDiff: { findMany: () => Promise.resolve(mockDiffs) },
    fileChange: {
      groupBy: () => Promise.resolve([]),
      findMany: () => Promise.resolve([]),
    },
  },
}));

// getHistoryIndex / getEntityTimeline delegate to "use cache" reads in
// ~/lib/history-cache, which call cacheLife() — a no-op outside the Next.js
// cache runtime, so stub it.
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  unstable_cacheLife: () => undefined,
}));

// Lazy-require after jest.mock: next/jest (SWC) does not hoist jest.mock, so a
// top-level import would load the real module before the stub is registered.
const { getHistoryIndex, getEntityTimeline } =
  require("~/lib/history-actions") as typeof HistoryActions;

describe("getHistoryIndex", () => {
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

    const index = await getHistoryIndex();
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

    const index = await getHistoryIndex();
    const build = index.builds.find((b) => b.build === 100);

    expect(build?.byCollection).toEqual({ types: 4, typeDogma: 1 });
    expect(build?.changeCount).toBe(5);
    expect(index.entityIdsByType).toEqual({ type: [587] });
  });
});

describe("getEntityTimeline", () => {
  it("survives dangling FKs: null date when the Build row is missing, skips changes with no diff", async () => {
    // diff 10 → build 98 (present); diff 11 → build 99 (Build row missing);
    // diff 999 is absent entirely (dangling Change.diffId).
    mockDiffs = [
      { id: 10, toBuild: 98 },
      { id: 11, toBuild: 99 },
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
        v: 1,
        kind: "added",
        values: { typeName: "Rifter" },
      },
      {
        build: 99,
        date: null,
        collection: "types",
        v: 1,
        kind: "modified",
        fields: { mass: { from: 1000, to: 1100 } },
      },
    ]);
  });
});
