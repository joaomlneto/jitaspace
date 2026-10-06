import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { EntityTimeline } from "~/lib/history";
// Type-only import: erased at runtime, so it does NOT load the real
// (Prisma-backed) module; used only to type the lazy require() below.
import type * as EntityPage from "~/lib/history-entity-page";
import { collectLabelRefs } from "~/lib/history-labels";

type Event = EntityTimeline["events"][number];
const base = { build: 100, date: null, v: 1 as const };
const timeline = (...events: Partial<Event>[]): EntityTimeline =>
  ({
    entityType: "type",
    entityId: 587,
    events: events.map((e) => ({ ...base, ...e })),
  }) as EntityTimeline;
const refs = (t: EntityTimeline | null) =>
  collectLabelRefs(t)
    .map(({ kind, id }) => `${kind} ${id}`)
    .sort();

describe("collectLabelRefs", () => {
  it("collects the ids in a record's fields, at any depth", () => {
    expect(
      refs(
        timeline({
          kind: "added",
          collection: "types",
          values: {
            groupID: 25,
            marketGroupID: 61,
            raceID: 2,
            factionID: 500002,
            metaGroupID: 4,
            wreckTypeID: 26_557,
            variationParentTypeID: 4302,
            designerIDs: [1_000_134],
            mass: 1_000_000,
            // A keyed array's entries, and ids nested inside them.
            dogmaAttributes: [{ attributeID: 9, value: 350 }],
            nested: { deeper: [{ effectID: 11 }] },
          },
        }),
      ),
    ).toEqual([
      "dogmaAttribute 9",
      "dogmaEffect 11",
      "faction 500002",
      "group 25",
      "marketGroup 61",
      "metaGroup 4",
      "npcCorporation 1000134",
      "race 2",
      "type 26557",
      "type 4302",
    ]);
  });

  it("collects both sides of a modified field", () => {
    expect(
      refs(
        timeline({
          kind: "modified",
          collection: "types",
          fields: {
            groupID: { from: 25, to: 26 },
            types: { from: [587], to: [587, 588] },
            materials: {
              from: [{ materialTypeID: 34, quantity: 1 }],
              to: [{ materialTypeID: 35, quantity: 2 }],
            },
          },
        }),
      ),
    ).toEqual([
      "group 25",
      "group 26",
      "type 34",
      "type 35",
      "type 587",
      "type 588",
    ]);
  });

  it("reads the ids a collection implies: skill keys and mastery certificates", () => {
    expect(
      refs(
        timeline(
          {
            kind: "added",
            collection: "requiredSkillsForTypes",
            values: { "3300": 1, "3327": 3 },
          },
          {
            kind: "modified",
            collection: "masteries",
            fields: { "4": { from: [96], to: [96, 117] } },
          },
        ),
      ),
    ).toEqual(["certificate 117", "certificate 96", "type 3300", "type 3327"]);
  });

  it("ignores what is not an integer id, and a missing timeline", () => {
    expect(
      refs(
        timeline({
          kind: "added",
          collection: "types",
          values: { groupID: "25", raceID: 1.5, factionID: null },
        }),
      ),
    ).toEqual([]);
    expect(refs(null)).toEqual([]);
  });
});

// ── readHistoryLabels / getCachedEntityHistory ──────────────────────────────

type Row = Record<string, unknown>;
let mockTables: Record<string, Row[]> = {};
const mockReadEntityNames = jest.fn(
  (changes: { entityType?: string; entityId: number }[], _atBuild?: number) =>
    Promise.resolve(
      Object.fromEntries(
        [...new Set(changes.map((c) => c.entityType ?? "type"))].map((k) => [
          k,
          Object.fromEntries(
            changes
              .filter((c) => (c.entityType ?? "type") === k)
              .map((c) => [c.entityId, `${k} ${c.entityId}`]),
          ),
        ]),
      ),
    ),
);
let mockTimeline: EntityTimeline | null = null;
let mockTimelineError: Error | null = null;
let mockTimelineHang = false;
const mockCapture = jest.fn();

// A Prisma stand-in: each model's findMany returns its table's rows whose id
// column is in the `where … in` filter.
jest.mock("~/lib/db", () => ({
  prisma: new Proxy(
    {},
    {
      get: (_, model: string) => ({
        findMany: (args: { where: Record<string, { in: number[] }> }) => {
          const [field, filter] = Object.entries(args.where)[0] ?? [];
          return Promise.resolve(
            (mockTables[model] ?? []).filter((r) =>
              filter?.in.includes(r[field ?? ""] as number),
            ),
          );
        },
      }),
    },
  ),
}));
jest.mock("~/lib/history-entity-names", () => ({
  readEntityNames: (
    changes: { entityType?: string; entityId: number }[],
    atBuild?: number,
  ) => mockReadEntityNames(changes, atBuild),
}));
jest.mock("~/lib/history-cache", () => ({
  getCachedEntityTimeline: () => {
    if (mockTimelineHang) return new Promise(() => undefined);
    return mockTimelineError
      ? Promise.reject(mockTimelineError)
      : Promise.resolve(mockTimeline);
  },
}));
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  cacheTag: () => undefined,
}));
const mockConnection = jest.fn(() => Promise.resolve());
jest.mock("next/server", () => ({ connection: () => mockConnection() }));
jest.mock("@sentry/nextjs", () => ({
  captureException: (e: unknown, c: unknown) => mockCapture(e, c),
}));

// Lazy-require after jest.mock: next/jest (SWC) does not hoist jest.mock.
const { getCachedEntityHistory, loadEntityHistory, readHistoryLabels } =
  require("~/lib/history-entity-page") as typeof EntityPage;

beforeEach(() => {
  mockTables = {};
  mockTimeline = null;
  mockTimelineError = null;
  mockTimelineHang = false;
  mockReadEntityNames.mockClear();
  mockCapture.mockClear();
  mockConnection.mockClear();
});

describe("readHistoryLabels", () => {
  it("reads breadcrumbs, market group chains and attribute units", async () => {
    mockTables = {
      type: [{ typeId: 587, groupId: 25 }],
      group: [
        { groupId: 25, categoryId: 6 },
        { groupId: 26, categoryId: 6 },
      ],
      marketGroup: [
        { marketGroupId: 61, parentMarketGroupId: 1361 },
        { marketGroupId: 1361, parentMarketGroupId: 4 },
        { marketGroupId: 4, parentMarketGroupId: null },
      ],
      dogmaAttribute: [
        { attributeId: 9, unitId: 1, highIsGood: true },
        { attributeId: 10, unitId: null, highIsGood: null },
      ],
      dogmaUnit: [
        { unitId: 1, displayName: "HP", name: "Hitpoints" },
        { unitId: 2, displayName: " ", name: "Length" },
      ],
    };

    const labels = await readHistoryLabels(
      [
        { kind: "type", id: 587 },
        { kind: "group", id: 26 },
        { kind: "marketGroup", id: 61 },
        { kind: "dogmaAttribute", id: 9 },
        { kind: "dogmaAttribute", id: 10 },
        { kind: "dogmaUnit", id: 2 },
      ],
      3_579_973,
    );

    expect(labels.parents).toEqual({
      type: { 587: 25 },
      group: { 25: 6, 26: 6 },
      marketGroup: { 61: 1361, 1361: 4 },
    });
    expect(labels.attributes).toEqual({
      9: { unitId: 1, highIsGood: true },
      10: { unitId: null, highIsGood: null },
    });
    // A blank display name falls back to the unit's name.
    expect(labels.unitSymbols).toEqual({ 1: "HP", 2: "Length" });
    // Everything a crumb shows is named, as of the build given.
    expect(labels.names).toMatchObject({
      type: { 587: "type 587" },
      group: { 25: "group 25", 26: "group 26" },
      category: { 6: "category 6" },
      marketGroup: {
        61: "marketGroup 61",
        1361: "marketGroup 1361",
        4: "marketGroup 4",
      },
      dogmaUnit: { 1: "dogmaUnit 1", 2: "dogmaUnit 2" },
    });
    expect(mockReadEntityNames.mock.calls[0]?.[1]).toBe(3_579_973);
  });

  it("stops a market group chain that loops", async () => {
    mockTables = {
      marketGroup: [
        { marketGroupId: 1, parentMarketGroupId: 2 },
        { marketGroupId: 2, parentMarketGroupId: 1 },
      ],
    };
    const labels = await readHistoryLabels([{ kind: "marketGroup", id: 1 }]);
    expect(labels.parents.marketGroup).toEqual({ 1: 2, 2: 1 });
  });
});

describe("getCachedEntityHistory", () => {
  it("names the entity and every id in its timeline, as of its latest build", async () => {
    mockTimeline = timeline(
      {
        build: 90,
        kind: "added",
        collection: "types",
        values: { groupID: 25 },
      },
      {
        build: 95,
        kind: "modified",
        collection: "types",
        fields: { raceID: { from: 1, to: 2 } },
      },
    );

    const history = await getCachedEntityHistory("type", 587);

    expect(history.name).toBe("type 587");
    expect(history.timeline).toBe(mockTimeline);
    expect(history.labels.names.race).toEqual({ 1: "race 1", 2: "race 2" });
    expect(mockReadEntityNames.mock.calls[0]?.[1]).toBe(95);
  });

  it("still names an entity with no recorded changes", async () => {
    const history = await getCachedEntityHistory("group", 25);
    expect(history).toMatchObject({ name: "group 25", timeline: null });
  });

  it("lets a failure throw rather than cache a wrong page", async () => {
    mockTimelineError = new Error("history DB down");
    await expect(getCachedEntityHistory("type", 587)).rejects.toThrow(
      "history DB down",
    );
  });
});

describe("loadEntityHistory", () => {
  it("passes the history through", async () => {
    expect(await loadEntityHistory("faction", 500_001)).toMatchObject({
      entityId: 500_001,
    });
    expect(mockConnection).not.toHaveBeenCalled();
  });

  it("gives up on a stalled read rather than hold the page open", async () => {
    mockTimelineHang = true;
    jest.useFakeTimers();
    try {
      const pending = loadEntityHistory("type", 587);
      await jest.advanceTimersByTimeAsync(10_000);
      expect(await pending).toBeNull();
      expect(mockCapture).toHaveBeenCalledTimes(1);
      expect(mockConnection).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("reports a failure and keeps the degraded page out of the cache", async () => {
    mockTimelineError = new Error("history DB down");

    expect(await loadEntityHistory("faction", 500_001)).toBeNull();
    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockConnection).toHaveBeenCalledTimes(1);
  });
});
