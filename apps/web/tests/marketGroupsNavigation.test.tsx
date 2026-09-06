import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// @swc/jest does not hoist jest.mock above imports, so register the mocks first
// and lazy-require the component. `cacheLife` is a no-op here — the caching
// behaviour is Next's, what matters is the queries and the tree that comes out.
jest.mock("next/cache", () => ({ cacheLife: jest.fn() }));

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

jest.mock("~/components/Market/MarketGroupNavLink", () => ({
  MarketGroupNavLink: () => null,
}));

const { MarketGroupsNavigation } =
  require("~/components/Market/MarketGroupsNavigation") as {
    MarketGroupsNavigation: () => Promise<{
      props: {
        children: {
          key: string | null;
          props: {
            marketGroupId: number;
            marketGroups: Record<
              number,
              {
                name: string;
                childrenMarketGroupIds: number[];
                types: { typeId: number; name: string }[];
              }
            >;
          };
        }[];
      };
    }>;
  };

describe("MarketGroupsNavigation", () => {
  beforeEach(() => {
    marketGroupFindMany.mockReset();
    typeFindMany.mockReset();
  });

  it("reads only types in a market group, and only the columns the tree needs", async () => {
    marketGroupFindMany.mockResolvedValue([]);
    typeFindMany.mockResolvedValue([]);

    await MarketGroupsNavigation();

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

  it("renders one nav link per root group, sorted by name", async () => {
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

    const result = await MarketGroupsNavigation();
    const links = result.props.children;

    // Only roots get a link, and "Ammunition" sorts before "Ships".
    expect(links.map((link) => link.props.marketGroupId)).toEqual([2, 1]);
  });

  it("hands each link the whole assembled tree", async () => {
    marketGroupFindMany.mockResolvedValue([
      { marketGroupId: 1, name: "Ships", parentMarketGroupId: null, iconId: 1 },
      { marketGroupId: 3, name: "Frigates", parentMarketGroupId: 1, iconId: 3 },
    ]);
    typeFindMany.mockResolvedValue([
      { typeId: 587, name: "Rifter", marketGroupId: 3 },
    ]);

    const result = await MarketGroupsNavigation();
    const index = result.props.children[0]!.props.marketGroups;

    expect(index[1]?.childrenMarketGroupIds).toEqual([3]);
    expect(index[3]?.types).toEqual([{ typeId: 587, name: "Rifter" }]);
  });

  it("renders nothing when there are no market groups", async () => {
    marketGroupFindMany.mockResolvedValue([]);
    typeFindMany.mockResolvedValue([]);

    const result = await MarketGroupsNavigation();

    expect(result.props.children).toEqual([]);
  });
});
