import { describe, expect, it } from "@jest/globals";

import type {
  MarketGroupRow,
  MarketTypeRow,
} from "~/components/Market/buildMarketGroupIndex";
import { buildMarketGroupIndex } from "~/components/Market/buildMarketGroupIndex";

const group = (
  marketGroupId: number,
  name: string,
  parentMarketGroupId: number | null = null,
  iconId: number | null = null,
): MarketGroupRow => ({ marketGroupId, name, parentMarketGroupId, iconId });

const type = (
  typeId: number,
  name: string,
  marketGroupId: number | null,
): MarketTypeRow => ({ typeId, name, marketGroupId });

describe("buildMarketGroupIndex", () => {
  it("indexes every market group by id, carrying name and icon", () => {
    const index = buildMarketGroupIndex(
      [group(1, "Ships", null, 1443), group(2, "Frigates", 1)],
      [],
    );

    expect(Object.keys(index)).toHaveLength(2);
    expect(index[1]).toEqual({
      name: "Ships",
      parentMarketGroupId: null,
      childrenMarketGroupIds: [2],
      types: [],
      iconId: 1443,
    });
    expect(index[2]?.iconId).toBeNull();
  });

  it("derives child edges from parentMarketGroupId", () => {
    const index = buildMarketGroupIndex(
      [
        group(1, "Ships"),
        group(2, "Frigates", 1),
        group(3, "Cruisers", 1),
        group(4, "Assault Frigates", 2),
      ],
      [],
    );

    expect(index[1]?.childrenMarketGroupIds).toEqual([2, 3]);
    expect(index[2]?.childrenMarketGroupIds).toEqual([4]);
    expect(index[4]?.childrenMarketGroupIds).toEqual([]);
  });

  it("groups types under their market group", () => {
    const index = buildMarketGroupIndex(
      [group(1, "Ships"), group(2, "Frigates", 1)],
      [type(587, "Rifter", 2), type(588, "Reaper", 2), type(670, "Capsule", 1)],
    );

    expect(index[2]?.types).toEqual([
      { typeId: 587, name: "Rifter" },
      { typeId: 588, name: "Reaper" },
    ]);
    expect(index[1]?.types).toEqual([{ typeId: 670, name: "Capsule" }]);
  });

  it("drops types with no market group", () => {
    const index = buildMarketGroupIndex(
      [group(1, "Ships")],
      [type(587, "Rifter", 1), type(99, "Unlisted", null)],
    );

    expect(index[1]?.types).toEqual([{ typeId: 587, name: "Rifter" }]);
  });

  it("drops rows pointing at a market group that does not exist", () => {
    const index = buildMarketGroupIndex(
      [group(1, "Ships"), group(2, "Orphan", 404)],
      [type(587, "Rifter", 909)],
    );

    // The dangling parent creates no placeholder entry...
    expect(index[404]).toBeUndefined();
    expect(index[909]).toBeUndefined();
    // ...and the orphan group itself is still indexed, just unreachable.
    expect(index[2]?.parentMarketGroupId).toBe(404);
    expect(index[1]?.types).toEqual([]);
  });

  it("returns an empty index for empty input", () => {
    expect(buildMarketGroupIndex([], [])).toEqual({});
  });

  it("keeps groups and types independent across the tree", () => {
    const index = buildMarketGroupIndex(
      [group(1, "Ships"), group(2, "Frigates", 1)],
      [type(587, "Rifter", 2)],
    );

    // A type under a child must not leak into the parent's own list.
    expect(index[1]?.types).toEqual([]);
    expect(index[2]?.types).toHaveLength(1);
  });
});
