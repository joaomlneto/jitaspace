import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Type-only import: erased at runtime, so it does NOT load the real
// (Prisma-backed) module; used only to type the lazy require() below.
import type * as BuildPageData from "~/app/history/build/[build]/data";

// Exercises the build page's server read by stubbing both databases it reads —
// the history DB for the build's changes and the app DB for type names — so no
// real Prisma client is loaded. The stubs close over these mutable fixtures
// (mock-prefixed so the jest factories accept them).

type Op = "added" | "modified" | "removed";

let mockBuild: {
  releasedAt: Date | null;
  server: "tranquility" | "singularity" | null;
} | null = null;
let mockEntityRows: {
  op: Op;
  entity: { kind: string; eveId: number };
  collection: { name: string };
}[] = [];
let mockStringRows: {
  op: Op;
  data: unknown;
  entity: { eveId: number };
  collection: { name: string };
}[] = [];
let mockFileRows: { path: string; op: Op }[] = [];
let mockTypes: { typeId: number; name: string }[] = [];

interface ChangeQuery {
  where: { collection: { name: { startsWith?: string } } };
}
interface TypeQuery {
  where: { typeId: { in: number[] } };
}
const mockTypeFindMany = jest.fn((args: TypeQuery) =>
  Promise.resolve(
    mockTypes.filter((t) => args.where.typeId.in.includes(t.typeId)),
  ),
);

jest.mock("@jitaspace/db-history", () => ({
  historyDb: {
    build: { findUnique: () => Promise.resolve(mockBuild) },
    // One findMany serves both change reads; they differ only in whether the
    // collection filter selects the `strings:*` collections or excludes them.
    change: {
      findMany: (args: ChangeQuery) =>
        Promise.resolve(
          args.where.collection.name.startsWith === undefined
            ? mockEntityRows
            : mockStringRows,
        ),
    },
    fileChange: { findMany: () => Promise.resolve(mockFileRows) },
  },
}));

jest.mock("~/lib/db", () => ({
  prisma: {
    type: { findMany: (args: TypeQuery) => mockTypeFindMany(args) },
  },
}));

// Lazy-require after jest.mock: next/jest (SWC) does not hoist jest.mock, so a
// top-level import would load the real modules before the stubs are registered.
const { getCachedBuildPage } =
  require("~/app/history/build/[build]/data") as typeof BuildPageData;

beforeEach(() => {
  mockBuild = { releasedAt: new Date("2026-06-08T11:00:00Z"), server: null };
  mockEntityRows = [];
  mockStringRows = [];
  mockFileRows = [];
  mockTypes = [];
  mockTypeFindMany.mockClear();
});

describe("getCachedBuildPage", () => {
  it("returns null for a build that does not exist", async () => {
    mockBuild = null;
    expect(await getCachedBuildPage(3383521)).toBeNull();
  });

  it("returns null for the pre-2012 baseline and for a Singularity build", async () => {
    mockBuild = { releasedAt: new Date("2011-05-06"), server: null };
    expect(await getCachedBuildPage(80313)).toBeNull();

    mockBuild = { releasedAt: new Date("2026-06-02"), server: "singularity" };
    expect(await getCachedBuildPage(700001)).toBeNull();
  });

  it("returns an empty page for an in-scope build with nothing recorded", async () => {
    expect(await getCachedBuildPage(3383521)).toEqual({
      build: 3383521,
      date: "2026-06-08",
      changes: [],
      typeNames: {},
      files: { added: [], changed: [], removed: [] },
      strings: {},
    });
    // No type entities ⇒ no name query at all.
    expect(mockTypeFindMany).not.toHaveBeenCalled();
  });

  it("lists entity changes without their payload, and names only the types", async () => {
    mockEntityRows = [
      {
        op: "added",
        entity: { kind: "type", eveId: 91920 },
        collection: { name: "types" },
      },
      {
        op: "modified",
        entity: { kind: "type", eveId: 587 },
        collection: { name: "typeDogma" },
      },
      {
        op: "modified",
        entity: { kind: "type", eveId: 587 },
        collection: { name: "types" },
      },
      {
        op: "removed",
        entity: { kind: "type", eveId: 999 },
        collection: { name: "types" },
      },
      // A skin's id collides with a real typeID; it must not be named as one.
      {
        op: "added",
        entity: { kind: "skin", eveId: 34 },
        collection: { name: "skins" },
      },
    ];
    mockTypes = [
      { typeId: 91920, name: "Pochven Spawner" },
      { typeId: 587, name: "Rifter" },
      { typeId: 34, name: "Tritanium" },
      // 999 has no row: newer than the ingested SDE.
    ];

    const page = await getCachedBuildPage(3383521);

    expect(page?.changes).toEqual([
      {
        entityId: 91920,
        entityType: "type",
        collection: "types",
        kind: "added",
      },
      {
        entityId: 587,
        entityType: "type",
        collection: "typeDogma",
        kind: "modified",
      },
      {
        entityId: 587,
        entityType: "type",
        collection: "types",
        kind: "modified",
      },
      {
        entityId: 999,
        entityType: "type",
        collection: "types",
        kind: "removed",
      },
      { entityId: 34, entityType: "skin", collection: "skins", kind: "added" },
    ]);
    expect(page?.typeNames).toEqual({
      91920: "Pochven Spawner",
      587: "Rifter",
    });
    // One query for every type on the page, each id asked for once.
    expect(mockTypeFindMany).toHaveBeenCalledTimes(1);
    expect(mockTypeFindMany.mock.calls[0]?.[0].where.typeId.in).toEqual([
      91920, 587, 999,
    ]);
  });

  it("leaves a blank type name out, so the row falls back like an unknown one", async () => {
    mockEntityRows = [
      {
        op: "added",
        entity: { kind: "type", eveId: 1 },
        collection: { name: "types" },
      },
    ];
    mockTypes = [{ typeId: 1, name: "  " }];

    expect((await getCachedBuildPage(3383521))?.typeNames).toEqual({});
  });

  it("buckets file paths by op", async () => {
    mockFileRows = [
      { path: "res:/a.png", op: "added" },
      { path: "res:/b.png", op: "modified" },
      { path: "res:/c.png", op: "removed" },
      { path: "res:/d.png", op: "added" },
    ];

    expect((await getCachedBuildPage(3383521))?.files).toEqual({
      added: ["res:/a.png", "res:/d.png"],
      changed: ["res:/b.png"],
      removed: ["res:/c.png"],
    });
  });

  it("groups string changes per language, omitting the absent side", async () => {
    mockStringRows = [
      {
        op: "added",
        data: { to: "Hello" },
        entity: { eveId: 1 },
        collection: { name: "strings:en-us" },
      },
      {
        op: "modified",
        data: { from: "Old", to: "New" },
        entity: { eveId: 2 },
        collection: { name: "strings:en-us" },
      },
      {
        op: "removed",
        data: { from: "Weg" },
        entity: { eveId: 3 },
        collection: { name: "strings:de" },
      },
      // A row with no payload still lists, with neither side.
      {
        op: "modified",
        data: null,
        entity: { eveId: 4 },
        collection: { name: "strings:de" },
      },
    ];

    const strings = (await getCachedBuildPage(3383521))?.strings;

    expect(strings).toEqual({
      "en-us": [
        { id: 1, kind: "added", to: "Hello" },
        { id: 2, kind: "changed", from: "Old", to: "New" },
      ],
      de: [
        { id: 3, kind: "removed", from: "Weg" },
        { id: 4, kind: "changed" },
      ],
    });
    // Absent sides are omitted, not present-and-undefined, which the RSC
    // payload would otherwise spell out on every row.
    expect(Object.keys(strings?.de?.[1] ?? {})).toEqual(["id", "kind"]);
  });

  it("lets a database failure throw instead of caching a wrong page", async () => {
    mockEntityRows = [
      {
        op: "added",
        entity: { kind: "type", eveId: 587 },
        collection: { name: "types" },
      },
    ];
    mockTypeFindMany.mockImplementationOnce(() =>
      Promise.reject(new Error("cluster disabled")),
    );

    await expect(getCachedBuildPage(3383521)).rejects.toThrow(
      "cluster disabled",
    );
  });
});
