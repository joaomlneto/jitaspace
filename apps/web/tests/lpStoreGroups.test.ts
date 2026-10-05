import { describe, expect, it, jest } from "@jest/globals";

import {
  filterLPStoreGroups,
  groupCorporationsByFaction,
} from "~/app/lp-store/groups";

const caldari = { factionId: 500001, name: "Caldari State" };
const guristas = { factionId: 500010, name: "Guristas Pirates" };

const groups = groupCorporationsByFaction([
  { corporationId: 3, name: "Lai Dai Corporation", faction: caldari },
  { corporationId: 1, name: "CBD Corporation", faction: caldari },
  { corporationId: 2, name: "Guristas", faction: guristas },
  { corporationId: 4, name: "Mystery Corp", faction: null },
  { corporationId: 5, name: "Another Mystery", faction: null },
]);

describe("groupCorporationsByFaction", () => {
  it("orders factions and their corporations by name, factionless last", () => {
    expect(groups).toEqual([
      {
        faction: { factionId: 500001, name: "Caldari State" },
        corporations: [
          { corporationId: 1, name: "CBD Corporation" },
          { corporationId: 3, name: "Lai Dai Corporation" },
        ],
      },
      {
        faction: { factionId: 500010, name: "Guristas Pirates" },
        corporations: [{ corporationId: 2, name: "Guristas" }],
      },
      {
        faction: null,
        corporations: [
          { corporationId: 5, name: "Another Mystery" },
          { corporationId: 4, name: "Mystery Corp" },
        ],
      },
    ]);
  });
});

describe("filterLPStoreGroups", () => {
  const names = (query: string) =>
    filterLPStoreGroups(groups, query).map((group) => [
      group.faction?.name ?? null,
      group.corporations.map(({ name }) => name),
    ]);

  it("returns every group for a blank query", () => {
    expect(filterLPStoreGroups(groups, "  ")).toBe(groups);
  });

  it("keeps a whole faction when its name matches", () => {
    expect(names("caldari")).toEqual([
      ["Caldari State", ["CBD Corporation", "Lai Dai Corporation"]],
    ]);
  });

  it("keeps only matching corporations otherwise, dropping empty groups", () => {
    expect(names(" MYSTERY ")).toEqual([
      [null, ["Another Mystery", "Mystery Corp"]],
    ]);
    expect(names("cbd")).toEqual([["Caldari State", ["CBD Corporation"]]]);
  });

  it("matches a corporation and a faction in different groups at once", () => {
    expect(names("guristas")).toEqual([["Guristas Pirates", ["Guristas"]]]);
    expect(names("corp")).toEqual([
      ["Caldari State", ["CBD Corporation", "Lai Dai Corporation"]],
      [null, ["Mystery Corp"]],
    ]);
  });

  it("returns nothing when nothing matches", () => {
    expect(names("amarr")).toEqual([]);
  });

  it("matches regardless of the browser locale (Turkish dotless ı)", () => {
    const imperial = groupCorporationsByFaction([
      { corporationId: 6, name: "Imperial Navy", faction: null },
    ]);
    // Make default-locale lowercasing behave as in a Turkish browser, where
    // "I" lowercases to "ı" and "Imperial Navy" would no longer contain "imperial".
    const spy = jest
      .spyOn(String.prototype, "toLocaleLowerCase")
      .mockImplementation(function (this: string) {
        return this.replace(/I/g, "ı").replace(/İ/g, "i").toLowerCase();
      });
    try {
      expect("Imperial".toLocaleLowerCase()).toBe("ımperial"); // the simulation holds
      expect(filterLPStoreGroups(imperial, "imperial")).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });
});
