import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// @swc/jest does not hoist jest.mock above imports, so register the mocks first
// and lazy-require the component. `cacheLife` is a no-op here — the caching
// behaviour is Next's, what matters is the queries and the tree that comes out.
jest.mock("next/cache", () => ({ cacheLife: jest.fn() }));

const marketGroupFindMany = jest.fn<() => Promise<Record<string, unknown>[]>>();
const typeFindMany = jest.fn<() => Promise<Record<string, unknown>[]>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    marketGroup: { findMany: () => marketGroupFindMany() },
    type: { findMany: () => typeFindMany() },
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
