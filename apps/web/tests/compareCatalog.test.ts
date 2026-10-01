/**
 * @jest-environment node
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { CompareCatalog } from "~/components/Compare/catalog";
import {
  COMPARABLE_CATEGORY_IDS,
  indexCompareCatalog,
} from "~/components/Compare/catalog";
import {
  MIN_SEARCH_LENGTH,
  searchCatalogTypes,
  suggestSameGroupTypes,
} from "~/components/Compare/search";

type Rows = Record<string, unknown>[];

const typeFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const groupFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const dogmaAttributeFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const dogmaUnitFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const dogmaAttributeCategoryFindMany =
  jest.fn<(a?: unknown) => Promise<Rows>>();
const metaGroupFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    type: { findMany: (a?: unknown) => typeFindMany(a) },
    group: { findMany: (a?: unknown) => groupFindMany(a) },
    dogmaAttribute: { findMany: (a?: unknown) => dogmaAttributeFindMany(a) },
    dogmaUnit: { findMany: (a?: unknown) => dogmaUnitFindMany(a) },
    dogmaAttributeCategory: {
      findMany: (a?: unknown) => dogmaAttributeCategoryFindMany(a),
    },
    metaGroup: { findMany: (a?: unknown) => metaGroupFindMany(a) },
  },
}));

const catalog: CompareCatalog = {
  types: [
    [11184, "Crusader", 831, 2],
    [587, "Rifter", 25, 1],
    [17812, "Republic Fleet Firetail", 25, 4],
    [585, "Slasher", 25, 1],
    [11176, "Crow", 831, 2],
    [3841, "Large Shield Extender II", 38, 2],
    [1, "Rifter Special Edition", 25, 0],
  ],
  groups: {
    25: { name: "Frigate", categoryId: 6 },
    831: { name: "Interceptor", categoryId: 6 },
    38: { name: "Shield Extender", categoryId: 7 },
  },
  attributes: {},
  unitSymbols: {},
  attributeCategories: {},
  metaGroups: { 1: "Tech I", 2: "Tech II", 4: "Faction" },
};
const indexed = indexCompareCatalog(catalog);
const names = (types: { name: string }[]) => types.map((type) => type.name);

describe("indexCompareCatalog", () => {
  it("indexes types by id and lists each group's types by name", () => {
    expect(indexed.typesById.get(587)).toEqual({
      typeId: 587,
      name: "Rifter",
      groupId: 25,
      metaGroupId: 1,
    });
    expect(indexed.typesById.get(1)?.metaGroupId).toBeUndefined();
    expect(indexed.typeIdsByGroup.get(25)).toEqual([17812, 587, 1, 585]);
  });
});

describe("searchCatalogTypes", () => {
  it("needs a minimum query length", () => {
    expect(
      searchCatalogTypes(indexed, "r".repeat(MIN_SEARCH_LENGTH - 1)),
    ).toEqual([]);
  });

  it("ranks an exact name first, then prefixes, then word matches", () => {
    expect(names(searchCatalogTypes(indexed, "Rifter"))).toEqual([
      "Rifter",
      "Rifter Special Edition",
    ]);
    expect(names(searchCatalogTypes(indexed, "fire"))).toEqual([
      "Republic Fleet Firetail",
    ]);
  });

  it("matches substrings and multi-word queries", () => {
    expect(names(searchCatalogTypes(indexed, "lash"))).toEqual(["Slasher"]);
    expect(names(searchCatalogTypes(indexed, "shield ii"))).toEqual([
      "Large Shield Extender II",
    ]);
  });

  it("finds items by their group name", () => {
    expect(names(searchCatalogTypes(indexed, "interceptor"))).toEqual([
      "Crow",
      "Crusader",
    ]);
  });

  it("finds an item by its type id", () => {
    expect(names(searchCatalogTypes(indexed, "587"))).toEqual(["Rifter"]);
  });

  it("leaves out excluded items and respects the limit", () => {
    expect(
      names(searchCatalogTypes(indexed, "rifter", { exclude: [587] })),
    ).toEqual(["Rifter Special Edition"]);
    expect(searchCatalogTypes(indexed, "r", { limit: 1 })).toHaveLength(0);
    expect(searchCatalogTypes(indexed, "er", { limit: 2 })).toHaveLength(2);
  });
});

describe("suggestSameGroupTypes", () => {
  it("suggests the rest of the item's group, minus the selection", () => {
    expect(
      names(suggestSameGroupTypes(indexed, 587, { exclude: [585] })),
    ).toEqual(["Republic Fleet Firetail", "Rifter Special Edition"]);
  });

  it("suggests nothing for an item outside the catalog", () => {
    expect(suggestSameGroupTypes(indexed, 999)).toEqual([]);
  });
});

describe("readCompareCatalog", () => {
  beforeEach(() => {
    typeFindMany.mockResolvedValue([
      { typeId: 587, name: "Rifter", groupId: 25, metaGroupId: 1 },
      { typeId: 1, name: "Prototype", groupId: 25, metaGroupId: null },
    ]);
    groupFindMany.mockResolvedValue([
      { groupId: 25, name: "Frigate", categoryId: 6 },
      { groupId: 26, name: "Cruiser", categoryId: 6 },
    ]);
    dogmaAttributeFindMany.mockResolvedValue([
      {
        attributeId: 263,
        name: "shieldCapacity",
        displayName: "Shield Capacity",
        attributeCategoryId: 2,
        unitId: 113,
        iconId: 1384,
        defaultValue: 0,
        highIsGood: true,
        published: true,
      },
      {
        attributeId: 460,
        name: null,
        displayName: "  ",
        attributeCategoryId: null,
        unitId: null,
        iconId: null,
        defaultValue: null,
        highIsGood: null,
        published: false,
      },
    ]);
    dogmaUnitFindMany.mockResolvedValue([
      { unitId: 113, displayName: "HP" },
      { unitId: 122, displayName: null },
    ]);
    dogmaAttributeCategoryFindMany.mockResolvedValue([
      { attributeCategoryId: 2, name: "Shield" },
    ]);
    metaGroupFindMany.mockResolvedValue([{ metaGroupId: 1, name: "Tech I" }]);
  });

  it("reads only published, live types of the comparable categories", async () => {
    const { readCompareCatalog } = await import("~/lib/compareCatalog");
    await readCompareCatalog();
    expect(typeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isDeleted: false,
          published: true,
          group: { categoryId: { in: [...COMPARABLE_CATEGORY_IDS] } },
        },
      }),
    );
  });

  it("maps the rows to the compact catalog shape", async () => {
    const { readCompareCatalog } = await import("~/lib/compareCatalog");
    expect(await readCompareCatalog()).toEqual({
      types: [
        [587, "Rifter", 25, 1],
        [1, "Prototype", 25, 0],
      ],
      // Groups without a searchable type are dropped.
      groups: { 25: { name: "Frigate", categoryId: 6 } },
      attributes: {
        263: {
          name: "shieldCapacity",
          displayName: "Shield Capacity",
          categoryId: 2,
          unitId: 113,
          iconId: 1384,
          defaultValue: 0,
          highIsGood: true,
          published: true,
        },
        460: {
          name: "attribute 460",
          displayName: undefined,
          categoryId: undefined,
          unitId: undefined,
          iconId: undefined,
          defaultValue: undefined,
          highIsGood: undefined,
          published: undefined,
        },
      },
      // A unit without a display name has no symbol, as in the client.
      unitSymbols: { 113: "HP" },
      attributeCategories: { 2: "Shield" },
      metaGroups: { 1: "Tech I" },
    });
  });

  it("lets a database failure propagate instead of caching an empty catalog", async () => {
    dogmaAttributeFindMany.mockRejectedValue(new Error("RU limit reached"));
    const { readCompareCatalog } = await import("~/lib/compareCatalog");
    await expect(readCompareCatalog()).rejects.toThrow("RU limit reached");
  });

  it("is served as JSON by the catalog route", async () => {
    const { GET } = await import("~/app/api/compare/catalog/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as CompareCatalog;
    expect(body.types).toEqual([
      [587, "Rifter", 25, 1],
      [1, "Prototype", 25, 0],
    ]);
  });
});
