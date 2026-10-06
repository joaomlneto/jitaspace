import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Type-only import: erased at runtime, so it does NOT load the real
// (Prisma-backed) module; used only to type the lazy require() below.
import type * as BuildPageData from "~/app/history/build/[build]/data";

// Exercises the build page's server read by stubbing both databases it reads —
// the history DB for the build's changes (and the names of entities newer than
// the SDE) and the app DB for names — so no real Prisma client is loaded. The
// stubs close over these mutable fixtures (mock-prefixed so the jest factories
// accept them).

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
let mockGroups: { groupId: number; name: string }[] = [];
// Rows of the two history-DB name reads, which the stub cannot run: each
// entity's name fields, then the English text of message ids. Ids are strings,
// as CockroachDB returns INT8.
let mockHistoryNameRows: {
  kind: string;
  id: string;
  fields: Record<string, unknown>;
}[] = [];
let mockMessageRows: { id: string; text: string | null }[] = [];

interface ChangeQuery {
  where: { collection: { name: { startsWith?: string } } };
}
interface InQuery<K extends string> {
  where: Record<K, { in: number[] }>;
}
const mockTypeFindMany = jest.fn((args: InQuery<"typeId">) =>
  Promise.resolve(
    mockTypes.filter((t) => args.where.typeId.in.includes(t.typeId)),
  ),
);
const mockGroupFindMany = jest.fn((args: InQuery<"groupId">) =>
  Promise.resolve(
    mockGroups.filter((g) => args.where.groupId.in.includes(g.groupId)),
  ),
);

// Every history-DB raw read as made, told apart by its SQL.
const mockQueryRaw = jest.fn(
  (strings: readonly string[], ..._values: unknown[]): Promise<unknown[]> => {
    const sql = strings.join("");
    if (sql.includes("unnest(")) return Promise.resolve(mockHistoryNameRows);
    if (sql.includes("'string:en-us'")) return Promise.resolve(mockMessageRows);
    return Promise.reject(new Error(`unexpected query: ${sql}`));
  },
);

// The data the raw read whose SQL contains `sqlPart` was sent with, leaving
// out the table names it interpolates; undefined when it was not made.
const rawQueryValues = (sqlPart: string) =>
  mockQueryRaw.mock.calls
    .find(([strings]) => strings.join("").includes(sqlPart))
    ?.slice(1)
    .filter((v) => !(typeof v === "object" && v !== null && "raw" in v));

jest.mock("@jitaspace/db-builds", () => ({
  buildsSchema: "public",
  Prisma: { raw: (sql: string) => ({ raw: sql }) },
  buildsDb: {
    $queryRaw: (strings: readonly string[], ...values: unknown[]) =>
      mockQueryRaw(strings, ...values),
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
    type: { findMany: (args: InQuery<"typeId">) => mockTypeFindMany(args) },
    group: { findMany: (args: InQuery<"groupId">) => mockGroupFindMany(args) },
    // No skin or unit rows: those are named from the history DB.
    skin: { findMany: () => Promise.resolve([]) },
    dogmaUnit: { findMany: () => Promise.resolve([]) },
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
  mockGroups = [];
  mockHistoryNameRows = [];
  mockMessageRows = [];
  mockTypeFindMany.mockClear();
  mockGroupFindMany.mockClear();
  mockQueryRaw.mockClear();
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
      names: {},
      files: { added: [], changed: [], removed: [] },
      strings: {},
    });
    // No entities ⇒ no name query at all.
    expect(mockTypeFindMany).not.toHaveBeenCalled();
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("lists entity changes without their payload, naming each kind from its own table", async () => {
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
    expect(page?.names).toEqual({
      type: { 91920: "Pochven Spawner", 587: "Rifter" },
    });
    // One query for every type on the page, each id asked for once.
    expect(mockTypeFindMany).toHaveBeenCalledTimes(1);
    expect(mockTypeFindMany.mock.calls[0]?.[0].where.typeId.in).toEqual([
      91920, 587, 999,
    ]);
    // Only what our tables lack goes to the history DB, as of this build: the
    // type they do not have, and the skin, whose id collides with a typeID.
    expect(rawQueryValues("unnest(")).toEqual([
      ["type", "skin"],
      [999, 34],
      ["types", "skins"],
      3383521,
    ]);
  });

  it("names what our tables lack from the build's own history, every kind", async () => {
    // A fresh build adds entities our SDE ingest has not seen: before this,
    // every row of a new build's "New types" read "Type #id".
    mockEntityRows = [
      {
        op: "added",
        entity: { kind: "type", eveId: 95741 },
        collection: { name: "types" },
      },
      {
        op: "added",
        entity: { kind: "type", eveId: 587 },
        collection: { name: "types" },
      },
      {
        op: "added",
        entity: { kind: "group", eveId: 4800 },
        collection: { name: "groups" },
      },
      {
        op: "modified",
        entity: { kind: "group", eveId: 25 },
        collection: { name: "groups" },
      },
      {
        op: "added",
        entity: { kind: "skin", eveId: 9000 },
        collection: { name: "skins" },
      },
      {
        op: "added",
        entity: { kind: "dogmaUnit", eveId: 1 },
        collection: { name: "dogmaUnits" },
      },
    ];
    mockTypes = [{ typeId: 587, name: "Rifter" }];
    mockGroups = [{ groupId: 25, name: "Frigate" }];
    mockHistoryNameRows = [
      // Client data names by message id; the text is in the strings history.
      { kind: "type", id: "95741", fields: { typeNameID: 1048545 } },
      { kind: "group", id: "4800", fields: { groupNameID: 777 } },
      // Some kinds carry the text itself.
      { kind: "skin", id: "9000", fields: { internalName: "Akoman Tetrimon" } },
      // A unit's name ("Length") beats its display symbol ("m").
      {
        kind: "dogmaUnit",
        id: "1",
        fields: { displayNameID: 778, name: "Length" },
      },
    ];
    mockMessageRows = [
      { id: "1048545", text: "Akoman" },
      { id: "777", text: "Attack Battlecruiser" },
      { id: "778", text: "m" },
    ];

    const page = await getCachedBuildPage(3579973);

    expect(page?.names).toEqual({
      type: { 587: "Rifter", 95741: "Akoman" },
      group: { 25: "Frigate", 4800: "Attack Battlecruiser" },
      skin: { 9000: "Akoman Tetrimon" },
      dogmaUnit: { 1: "Length" },
    });
    // Message ids are read once, as of the same build.
    expect(rawQueryValues("'string:en-us'")).toEqual([
      [1048545, 777, 778],
      3579973,
    ]);
  });

  it("reads an SDE-shaped record's localized name", async () => {
    mockEntityRows = [
      {
        op: "added",
        entity: { kind: "type", eveId: 1 },
        collection: { name: "types" },
      },
    ];
    mockHistoryNameRows = [
      { kind: "type", id: "1", fields: { name: { en: "Tritanium", de: "x" } } },
    ];

    expect((await getCachedBuildPage(3383521))?.names).toEqual({
      type: { 1: "Tritanium" },
    });
    // No message ids among the fields ⇒ no strings read.
    expect(rawQueryValues("'string:en-us'")).toBeUndefined();
  });

  it("skips the history DB when our tables name everything", async () => {
    mockEntityRows = [
      {
        op: "modified",
        entity: { kind: "type", eveId: 587 },
        collection: { name: "typeDogma" },
      },
    ];
    mockTypes = [{ typeId: 587, name: "Rifter" }];

    expect((await getCachedBuildPage(3383521))?.names).toEqual({
      type: { 587: "Rifter" },
    });
    expect(mockQueryRaw).not.toHaveBeenCalled();
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

    expect((await getCachedBuildPage(3383521))?.names).toEqual({});
    // A blank SDE name is a miss, so the history DB is asked for it.
    expect(rawQueryValues("unnest(")?.[1]).toEqual([1]);
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

  it("lets a failed history name read throw too", async () => {
    mockEntityRows = [
      {
        op: "added",
        entity: { kind: "type", eveId: 95741 },
        collection: { name: "types" },
      },
    ];
    mockQueryRaw.mockImplementationOnce(() =>
      Promise.reject(new Error("history DB down")),
    );

    await expect(getCachedBuildPage(3579973)).rejects.toThrow(
      "history DB down",
    );
  });
});
