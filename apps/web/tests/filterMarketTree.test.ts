import { describe, expect, it, jest } from "@jest/globals";

import type { MarketTree } from "~/components/Market/readMarketTree";
import { filterMarketTree } from "~/components/Market/filterMarketTree";

// Ships (4)
//   Frigates (1361): Rifter, Merlin
//   Cruisers (1367): Rupture
// Ammunition & Charges (11)
//   Hybrid Charges (99): Antimatter Charge S
const group = (
  name: string,
  parentMarketGroupId: number | null,
  childrenMarketGroupIds: number[],
  types: [number, string][] = [],
) => ({
  name,
  parentMarketGroupId,
  childrenMarketGroupIds,
  types: types.map(([typeId, typeName]) => ({ typeId, name: typeName })),
  iconId: null,
});

const tree: MarketTree = {
  rootMarketGroupIds: [11, 4],
  marketGroups: {
    4: group("Ships", null, [1361, 1367]),
    1361: group(
      "Frigates",
      4,
      [],
      [
        [587, "Rifter"],
        [603, "Merlin"],
      ],
    ),
    1367: group("Cruisers", 4, [], [[621, "Rupture"]]),
    11: group("Ammunition & Charges", null, [99]),
    99: group("Hybrid Charges", 11, [], [[230, "Antimatter Charge S"]]),
  },
};

describe("filterMarketTree", () => {
  it("returns null for an empty or blank query", () => {
    expect(filterMarketTree(tree, "")).toBeNull();
    expect(filterMarketTree(tree, "   ")).toBeNull();
  });

  it("keeps a matching type and the groups above it, and opens them", () => {
    const filter = filterMarketTree(tree, "rifter");

    expect(filter?.visibleTypeIds).toEqual(new Set([587]));
    expect(filter?.visibleGroupIds).toEqual(new Set([4, 1361]));
    expect(filter?.expandedGroupIds).toEqual(new Set([4, 1361]));
    expect(filter?.matchCount).toBe(1);
  });

  it("matches case-insensitively, anywhere in the name", () => {
    expect(filterMarketTree(tree, "  RLI ")?.visibleTypeIds).toEqual(
      new Set([603]),
    );
  });

  it("does not depend on the browser's locale", () => {
    // Under a Turkish locale, toLocaleLowerCase turns "I" into a dotless "ı".
    const spy = jest
      .spyOn(String.prototype, "toLocaleLowerCase")
      .mockImplementation(function (this: string) {
        return this.replace(/I/g, "ı").toLowerCase();
      });
    try {
      const turkish: MarketTree = {
        rootMarketGroupIds: [1],
        marketGroups: {
          1: group(
            "Ship Equipment",
            null,
            [],
            [[11577, "Improved Cloaking Device II"]],
          ),
        },
      };
      expect(filterMarketTree(turkish, "imp")?.visibleTypeIds).toEqual(
        new Set([11577]),
      );
    } finally {
      spy.mockRestore();
    }
  });

  it("keeps a matching group's whole subtree, but opens only its parents", () => {
    const filter = filterMarketTree(tree, "frigates");

    expect(filter?.visibleGroupIds).toEqual(new Set([4, 1361]));
    expect(filter?.visibleTypeIds).toEqual(new Set([587, 603]));
    // Frigates itself stays closed: a matched group can hold thousands of
    // types, which should not all render at once.
    expect(filter?.expandedGroupIds).toEqual(new Set([4]));
  });

  it("keeps sub-groups of a matching group visible", () => {
    const filter = filterMarketTree(tree, "ships");

    expect(filter?.visibleGroupIds).toEqual(new Set([4, 1361, 1367]));
    expect(filter?.visibleTypeIds).toEqual(new Set([587, 603, 621]));
    expect(filter?.expandedGroupIds).toEqual(new Set());
  });

  it("counts group and type matches across branches", () => {
    // "Charges" (Ammunition & Charges, Hybrid Charges) and "Antimatter Charge S".
    const filter = filterMarketTree(tree, "charge");

    expect(filter?.matchCount).toBe(3);
    expect(filter?.visibleGroupIds).toEqual(new Set([11, 99]));
    expect(filter?.expandedGroupIds).toEqual(new Set([11, 99]));
  });

  it("shows nothing when nothing matches", () => {
    const filter = filterMarketTree(tree, "titan");

    expect(filter?.visibleGroupIds.size).toBe(0);
    expect(filter?.visibleTypeIds.size).toBe(0);
    expect(filter?.matchCount).toBe(0);
  });

  it("ignores ids missing from the index", () => {
    const broken: MarketTree = {
      rootMarketGroupIds: [4, 404],
      marketGroups: { 4: group("Ships", null, [405]) },
    };

    expect(filterMarketTree(broken, "ships")?.visibleGroupIds).toEqual(
      new Set([4]),
    );
  });
});
