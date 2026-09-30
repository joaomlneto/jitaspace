/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as RouteModule from "~/app/api/market-tree/route";
import type * as ReadMarketTreeModule from "~/components/Market/readMarketTree";

// @swc/jest does not hoist jest.mock above imports, so register the mocks first
// and lazy-require the modules. The cache calls are recorded rather than
// no-ops: the tree must be cached until the next SDE ingest, and that is what
// keeps the route from re-reading ~20k rows.
const cacheLife = jest.fn();
const cacheTag = jest.fn();
jest.mock("next/cache", () => ({
  cacheLife: (...args: unknown[]) => cacheLife(...args),
  cacheTag: (...args: unknown[]) => cacheTag(...args),
}));

// Args are forwarded rather than swallowed: the `marketGroupId IS NOT NULL`
// filter and the narrow `select` are the point of these queries, so they get
// asserted on below — a mock that drops its arguments cannot catch their loss.
const marketGroupFindMany =
  jest.fn<(args?: unknown) => Promise<Record<string, unknown>[]>>();
const typeFindMany =
  jest.fn<(args?: unknown) => Promise<Record<string, unknown>[]>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    marketGroup: { findMany: (args: unknown) => marketGroupFindMany(args) },
    type: { findMany: (args: unknown) => typeFindMany(args) },
  },
}));

const { readMarketTree } =
  require("~/components/Market/readMarketTree") as typeof ReadMarketTreeModule;
const { GET } = require("~/app/api/market-tree/route") as typeof RouteModule;

describe("readMarketTree", () => {
  beforeEach(() => {
    marketGroupFindMany.mockReset();
    typeFindMany.mockReset();
    cacheLife.mockReset();
    cacheTag.mockReset();
  });

  it("reads only types in a market group, and only the columns the tree needs", async () => {
    marketGroupFindMany.mockResolvedValue([]);
    typeFindMany.mockResolvedValue([]);

    await readMarketTree();

    // Dropping the filter would read all ~53k types instead of the ~20k that
    // belong to a market group; widening the select would drag `description`
    // (6.6 MiB) back into a read that exists to fetch names.
    expect(typeFindMany).toHaveBeenCalledWith({
      where: { marketGroupId: { not: null } },
      select: { typeId: true, name: true, marketGroupId: true },
    });
    // iconId is bundled deliberately — resolving it client-side costs ~3
    // requests per visible NavLink.
    expect(marketGroupFindMany).toHaveBeenCalledWith({
      select: {
        marketGroupId: true,
        name: true,
        parentMarketGroupId: true,
        iconId: true,
      },
    });
  });

  it("is cached until the next SDE ingest", async () => {
    marketGroupFindMany.mockResolvedValue([]);
    typeFindMany.mockResolvedValue([]);

    await readMarketTree();

    expect(cacheTag).toHaveBeenCalledWith("sde");
    expect(cacheLife).toHaveBeenCalledWith("max");
  });

  it("lists the root groups sorted by name", async () => {
    marketGroupFindMany.mockResolvedValue([
      { marketGroupId: 1, name: "Ships", parentMarketGroupId: null, iconId: 1 },
      {
        marketGroupId: 2,
        name: "Ammunition",
        parentMarketGroupId: null,
        iconId: 2,
      },
      { marketGroupId: 3, name: "Frigates", parentMarketGroupId: 1, iconId: 3 },
    ]);
    typeFindMany.mockResolvedValue([]);

    const tree = await readMarketTree();

    // Only roots are listed, and "Ammunition" sorts before "Ships".
    expect(tree.rootMarketGroupIds).toEqual([2, 1]);
  });

  it("assembles the whole tree", async () => {
    marketGroupFindMany.mockResolvedValue([
      { marketGroupId: 1, name: "Ships", parentMarketGroupId: null, iconId: 1 },
      { marketGroupId: 3, name: "Frigates", parentMarketGroupId: 1, iconId: 3 },
    ]);
    typeFindMany.mockResolvedValue([
      { typeId: 587, name: "Rifter", marketGroupId: 3 },
    ]);

    const { marketGroups } = await readMarketTree();

    expect(marketGroups[1]?.childrenMarketGroupIds).toEqual([3]);
    expect(marketGroups[3]?.types).toEqual([{ typeId: 587, name: "Rifter" }]);
  });

  it("is empty when there are no market groups", async () => {
    marketGroupFindMany.mockResolvedValue([]);
    typeFindMany.mockResolvedValue([]);

    expect(await readMarketTree()).toEqual({
      rootMarketGroupIds: [],
      marketGroups: {},
    });
  });

  // A failed read must reach the route as a throw, not an empty tree: a
  // caught failure here would be prerendered and served until the next ingest.
  it("lets a database failure throw", async () => {
    marketGroupFindMany.mockRejectedValue(new Error("cluster disabled"));
    typeFindMany.mockResolvedValue([]);

    await expect(readMarketTree()).rejects.toThrow("cluster disabled");
  });
});

describe("GET /api/market-tree", () => {
  it("serves the tree as JSON", async () => {
    marketGroupFindMany.mockResolvedValue([
      { marketGroupId: 1, name: "Ships", parentMarketGroupId: null, iconId: 1 },
    ]);
    typeFindMany.mockResolvedValue([
      { typeId: 587, name: "Rifter", marketGroupId: 1 },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({
      rootMarketGroupIds: [1],
      marketGroups: {
        1: {
          name: "Ships",
          parentMarketGroupId: null,
          childrenMarketGroupIds: [],
          types: [{ typeId: 587, name: "Rifter" }],
          iconId: 1,
        },
      },
    });
  });
});
