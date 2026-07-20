import {
  isIdInRanges,
  characterIdRanges,
  corporationIdRanges,
  allianceIdRanges,
  regionIdRanges,
  constellationIdRanges,
  solarSystemRanges,
  stargateRanges,
  stationRanges,
  npcCharacterIdRanges,
} from "../src/id_ranges";

describe("isIdInRanges", () => {
  it("returns true when id is at the lower boundary of a range", () => {
    expect(isIdInRanges(10, [[10, 20]])).toBe(true);
  });

  it("returns true when id is at the upper boundary of a range", () => {
    expect(isIdInRanges(20, [[10, 20]])).toBe(true);
  });

  it("returns true when id is strictly inside a range", () => {
    expect(isIdInRanges(15, [[10, 20]])).toBe(true);
  });

  it("returns false when id is one below the lower boundary", () => {
    expect(isIdInRanges(9, [[10, 20]])).toBe(false);
  });

  it("returns false when id is one above the upper boundary", () => {
    expect(isIdInRanges(21, [[10, 20]])).toBe(false);
  });

  it("returns false for empty ranges array", () => {
    expect(isIdInRanges(15, [])).toBe(false);
  });

  it("returns true when id matches the second of multiple ranges", () => {
    expect(
      isIdInRanges(50, [
        [10, 20],
        [40, 60],
      ]),
    ).toBe(true);
  });

  it("returns false when id falls in the gap between two ranges", () => {
    expect(
      isIdInRanges(30, [
        [10, 20],
        [40, 60],
      ]),
    ).toBe(false);
  });
});

// -----------------------------------------------------------------------
// characterIdRanges
// -----------------------------------------------------------------------
describe("characterIdRanges", () => {
  // range 1: [3000000, 4000000] – NPC characters
  it("accepts 3000000 (NPC char range min)", () => {
    expect(isIdInRanges(3000000, characterIdRanges)).toBe(true);
  });

  it("accepts 4000000 (NPC char range max)", () => {
    expect(isIdInRanges(4000000, characterIdRanges)).toBe(true);
  });

  it("accepts 3500000 (mid NPC char range)", () => {
    expect(isIdInRanges(3500000, characterIdRanges)).toBe(true);
  });

  it("rejects 2999999 (one below NPC char range)", () => {
    expect(isIdInRanges(2999999, characterIdRanges)).toBe(false);
  });

  // range 2: [90000000, 98000000] – player characters
  it("accepts 90000000 (player char range min)", () => {
    expect(isIdInRanges(90000000, characterIdRanges)).toBe(true);
  });

  it("accepts 98000000 (player char range max)", () => {
    expect(isIdInRanges(98000000, characterIdRanges)).toBe(true);
  });

  it("accepts 95000000 (mid player char range)", () => {
    expect(isIdInRanges(95000000, characterIdRanges)).toBe(true);
  });

  it("rejects 89999999 (one below player char range)", () => {
    expect(isIdInRanges(89999999, characterIdRanges)).toBe(false);
  });

  it("rejects 98000001 (one above player char range but below next range)", () => {
    expect(isIdInRanges(98000001, characterIdRanges)).toBe(false);
  });

  // range 3: [2100000000, 2147483647] – new-format player characters
  it("accepts 2100000000 (new player char range min)", () => {
    expect(isIdInRanges(2100000000, characterIdRanges)).toBe(true);
  });

  it("accepts 2147483647 (new player char range max)", () => {
    expect(isIdInRanges(2147483647, characterIdRanges)).toBe(true);
  });

  it("rejects 2099999999 (one below new player char range)", () => {
    expect(isIdInRanges(2099999999, characterIdRanges)).toBe(false);
  });

  it("rejects 2147483648 (one above new player char range)", () => {
    expect(isIdInRanges(2147483648, characterIdRanges)).toBe(false);
  });
});

// -----------------------------------------------------------------------
// npcCharacterIdRanges
// -----------------------------------------------------------------------
describe("npcCharacterIdRanges", () => {
  it("accepts an NPC character ID (3000001)", () => {
    expect(isIdInRanges(3000001, npcCharacterIdRanges)).toBe(true);
  });

  it("accepts 3000000 (NPC char range min)", () => {
    expect(isIdInRanges(3000000, npcCharacterIdRanges)).toBe(true);
  });

  it("accepts 4000000 (NPC char range max)", () => {
    expect(isIdInRanges(4000000, npcCharacterIdRanges)).toBe(true);
  });

  it("rejects a player character ID (95000000)", () => {
    expect(isIdInRanges(95000000, npcCharacterIdRanges)).toBe(false);
  });

  it("rejects 2999999 (one below NPC range min)", () => {
    expect(isIdInRanges(2999999, npcCharacterIdRanges)).toBe(false);
  });

  it("rejects 4000001 (one above NPC range max)", () => {
    expect(isIdInRanges(4000001, npcCharacterIdRanges)).toBe(false);
  });
});

// -----------------------------------------------------------------------
// corporationIdRanges
// -----------------------------------------------------------------------
describe("corporationIdRanges", () => {
  // range 1: [1000000, 2000000]
  it("accepts 1000000 (corp range 1 min)", () => {
    expect(isIdInRanges(1000000, corporationIdRanges)).toBe(true);
  });

  it("accepts 2000000 (corp range 1 max)", () => {
    expect(isIdInRanges(2000000, corporationIdRanges)).toBe(true);
  });

  it("accepts 1500000 (mid corp range 1)", () => {
    expect(isIdInRanges(1500000, corporationIdRanges)).toBe(true);
  });

  it("rejects 999999 (one below corp range 1 min)", () => {
    expect(isIdInRanges(999999, corporationIdRanges)).toBe(false);
  });

  it("rejects 2000001 (one above corp range 1 max, before range 2)", () => {
    expect(isIdInRanges(2000001, corporationIdRanges)).toBe(false);
  });

  // range 2: [98000000, 99000000]
  it("accepts 98000000 (corp range 2 min)", () => {
    expect(isIdInRanges(98000000, corporationIdRanges)).toBe(true);
  });

  it("accepts 99000000 (corp range 2 max)", () => {
    expect(isIdInRanges(99000000, corporationIdRanges)).toBe(true);
  });

  it("rejects 97999999 (one below corp range 2 min)", () => {
    expect(isIdInRanges(97999999, corporationIdRanges)).toBe(false);
  });

  it("rejects 99000001 (one above corp range 2 max)", () => {
    expect(isIdInRanges(99000001, corporationIdRanges)).toBe(false);
  });
});

// -----------------------------------------------------------------------
// allianceIdRanges
// -----------------------------------------------------------------------
describe("allianceIdRanges", () => {
  // range: [99000000, 100000000]
  it("accepts 99000000 (alliance range min)", () => {
    expect(isIdInRanges(99000000, allianceIdRanges)).toBe(true);
  });

  it("accepts 100000000 (alliance range max)", () => {
    expect(isIdInRanges(100000000, allianceIdRanges)).toBe(true);
  });

  it("accepts 99500000 (mid alliance range)", () => {
    expect(isIdInRanges(99500000, allianceIdRanges)).toBe(true);
  });

  it("rejects 98999999 (one below alliance range min)", () => {
    expect(isIdInRanges(98999999, allianceIdRanges)).toBe(false);
  });

  it("rejects 100000001 (one above alliance range max)", () => {
    expect(isIdInRanges(100000001, allianceIdRanges)).toBe(false);
  });
});

// -----------------------------------------------------------------------
// regionIdRanges
// -----------------------------------------------------------------------
describe("regionIdRanges", () => {
  // range: [10000000, 13000000]
  it("accepts 10000000 (region range min)", () => {
    expect(isIdInRanges(10000000, regionIdRanges)).toBe(true);
  });

  it("accepts 13000000 (region range max)", () => {
    expect(isIdInRanges(13000000, regionIdRanges)).toBe(true);
  });

  it("accepts 10000002 (The Forge – known region ID)", () => {
    expect(isIdInRanges(10000002, regionIdRanges)).toBe(true);
  });

  it("rejects 9999999 (one below region range min)", () => {
    expect(isIdInRanges(9999999, regionIdRanges)).toBe(false);
  });

  it("rejects 13000001 (one above region range max)", () => {
    expect(isIdInRanges(13000001, regionIdRanges)).toBe(false);
  });
});

// -----------------------------------------------------------------------
// constellationIdRanges
// -----------------------------------------------------------------------
describe("constellationIdRanges", () => {
  // range: [20000000, 23000000]
  it("accepts 20000000 (constellation range min)", () => {
    expect(isIdInRanges(20000000, constellationIdRanges)).toBe(true);
  });

  it("accepts 23000000 (constellation range max)", () => {
    expect(isIdInRanges(23000000, constellationIdRanges)).toBe(true);
  });

  it("accepts 20000068 (Kimotoro – known constellation ID)", () => {
    expect(isIdInRanges(20000068, constellationIdRanges)).toBe(true);
  });

  it("rejects 19999999 (one below constellation range min)", () => {
    expect(isIdInRanges(19999999, constellationIdRanges)).toBe(false);
  });

  it("rejects 23000001 (one above constellation range max)", () => {
    expect(isIdInRanges(23000001, constellationIdRanges)).toBe(false);
  });
});

// -----------------------------------------------------------------------
// solarSystemRanges
// -----------------------------------------------------------------------
describe("solarSystemRanges", () => {
  // range: [30000000, 33000000]
  it("accepts 30000000 (solar system range min)", () => {
    expect(isIdInRanges(30000000, solarSystemRanges)).toBe(true);
  });

  it("accepts 33000000 (solar system range max)", () => {
    expect(isIdInRanges(33000000, solarSystemRanges)).toBe(true);
  });

  it("accepts 30000142 (Jita – known solar system ID)", () => {
    expect(isIdInRanges(30000142, solarSystemRanges)).toBe(true);
  });

  it("rejects 29999999 (one below solar system range min)", () => {
    expect(isIdInRanges(29999999, solarSystemRanges)).toBe(false);
  });

  it("rejects 33000001 (one above solar system range max)", () => {
    expect(isIdInRanges(33000001, solarSystemRanges)).toBe(false);
  });
});

// -----------------------------------------------------------------------
// stargateRanges
// -----------------------------------------------------------------------
describe("stargateRanges", () => {
  // range: [50000000, 60000000]
  it("accepts 50000000 (stargate range min)", () => {
    expect(isIdInRanges(50000000, stargateRanges)).toBe(true);
  });

  it("accepts 60000000 (stargate range max)", () => {
    expect(isIdInRanges(60000000, stargateRanges)).toBe(true);
  });

  it("accepts 50000056 (a known stargate ID in Jita)", () => {
    expect(isIdInRanges(50000056, stargateRanges)).toBe(true);
  });

  it("rejects 49999999 (one below stargate range min)", () => {
    expect(isIdInRanges(49999999, stargateRanges)).toBe(false);
  });

  it("rejects 60000001 (one above stargate range max)", () => {
    expect(isIdInRanges(60000001, stargateRanges)).toBe(false);
  });
});

// -----------------------------------------------------------------------
// stationRanges
// -----------------------------------------------------------------------
describe("stationRanges", () => {
  // range: [60000000, 70000000]
  it("accepts 60000000 (station range min)", () => {
    expect(isIdInRanges(60000000, stationRanges)).toBe(true);
  });

  it("accepts 70000000 (station range max)", () => {
    expect(isIdInRanges(70000000, stationRanges)).toBe(true);
  });

  it("accepts 60004588 (Jita 4-4 – known station ID)", () => {
    expect(isIdInRanges(60004588, stationRanges)).toBe(true);
  });

  it("rejects 59999999 (one below station range min)", () => {
    expect(isIdInRanges(59999999, stationRanges)).toBe(false);
  });

  it("rejects 70000001 (one above station range max)", () => {
    expect(isIdInRanges(70000001, stationRanges)).toBe(false);
  });
});
