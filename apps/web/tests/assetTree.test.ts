import { describe, expect, it } from "@jest/globals";

import type { CharacterAsset } from "@jitaspace/hooks";

import {
  assetSection,
  buildAssetTree,
  groupBySection,
  humanizeFlag,
  isFlatSectioning,
} from "../components/Assets/assetTree";

/**
 * Unit tests for the pure asset-tree logic that powers the Character Assets
 * browser. These exercise the hierarchy construction (nested ships/containers),
 * value + stack aggregation, root-location resolution and the ship-fit section
 * grouping — none of which is otherwise covered, since the page components only
 * render the result.
 */

const JITA = 60003760;
const AMARR = 60008494;

const asset = (
  a: Pick<
    CharacterAsset,
    "item_id" | "type_id" | "quantity" | "location_id" | "location_flag" | "location_type"
  > &
    Partial<CharacterAsset>,
): CharacterAsset => ({ is_singleton: false, ...a });

// A Megathron (fitted + cargo) and a stack of Tritanium in Jita; a container
// holding some loot in Amarr.
const SHIP = 1001;
const CONTAINER = 1003;
const fixture: Record<string, CharacterAsset> = {
  1001: asset({ item_id: SHIP, type_id: 641, quantity: 1, location_id: JITA, location_flag: "Hangar", location_type: "station", is_singleton: true }),
  2001: asset({ item_id: 2001, type_id: 3001, quantity: 1, location_id: SHIP, location_flag: "HiSlot0", location_type: "item", is_singleton: true }),
  2002: asset({ item_id: 2002, type_id: 222, quantity: 5000, location_id: SHIP, location_flag: "Cargo", location_type: "item" }),
  1002: asset({ item_id: 1002, type_id: 34, quantity: 1_000_000, location_id: JITA, location_flag: "Hangar", location_type: "station" }),
  1003: asset({ item_id: CONTAINER, type_id: 3465, quantity: 1, location_id: AMARR, location_flag: "Hangar", location_type: "station", is_singleton: true }),
  2003: asset({ item_id: 2003, type_id: 34, quantity: 50, location_id: CONTAINER, location_flag: "Unlocked", location_type: "item" }),
};

const prices = {
  641: { adjusted_price: 100_000_000 },
  3001: { adjusted_price: 1_000_000 },
  222: { adjusted_price: 100 },
  34: { adjusted_price: 5 },
  3465: { adjusted_price: 2_000_000 },
};

describe("buildAssetTree", () => {
  const tree = buildAssetTree(fixture, prices);

  it("counts every stack and sums the total value", () => {
    expect(tree.totalStacks).toBe(6);
    // 100M ship + 1M gun + 500K ammo + 5M trit + 2M container + 250 loot
    expect(tree.totalValue).toBe(108_500_250);
  });

  it("nests items under their parent container/ship", () => {
    expect(tree.childrenByParent.get(JITA)?.map((a) => a.item_id).sort()).toEqual([1001, 1002]);
    expect(tree.childrenByParent.get(SHIP)?.map((a) => a.item_id).sort()).toEqual([2001, 2002]);
    expect(tree.childrenByParent.get(CONTAINER)?.map((a) => a.item_id)).toEqual([2003]);
  });

  it("rolls up subtree value to include contents", () => {
    expect(tree.subtreeValue.get(SHIP)).toBe(101_500_000); // ship + gun + ammo
    expect(tree.subtreeValue.get(CONTAINER)).toBe(2_000_250); // container + loot
  });

  it("counts subtree stacks including the node itself", () => {
    expect(tree.subtreeStacks.get(SHIP)).toBe(3);
    expect(tree.subtreeStacks.get(CONTAINER)).toBe(2);
    expect(tree.subtreeStacks.get(1002)).toBe(1);
  });

  it("resolves the root location by walking up parents", () => {
    expect(tree.rootLocationOf.get(2001)).toBe(JITA); // module inside the ship
    expect(tree.rootLocationOf.get(2003)).toBe(AMARR); // loot inside the container
    expect(tree.rootLocationOf.get(1002)).toBe(JITA); // top-level stack
  });

  it("summarises locations and sorts them by value", () => {
    expect(tree.locations.map((l) => l.locationId)).toEqual([JITA, AMARR]);
    const [jita, amarr] = tree.locations;
    expect(jita?.value).toBe(106_500_000);
    expect(jita?.stacks).toBe(4);
    expect(amarr?.value).toBe(2_000_250);
    expect(amarr?.stacks).toBe(2);
  });

  it("treats missing market prices as zero value", () => {
    const tree = buildAssetTree(
      { 1: asset({ item_id: 1, type_id: 9, quantity: 3, location_id: JITA, location_flag: "Hangar", location_type: "station" }) },
      {},
    );
    expect(tree.totalValue).toBe(0);
    expect(tree.totalStacks).toBe(1);
    expect(tree.locations[0]?.value).toBe(0);
  });

  it("handles an empty asset set", () => {
    const tree = buildAssetTree({}, {});
    expect(tree.totalStacks).toBe(0);
    expect(tree.locations).toEqual([]);
  });
});

describe("assetSection", () => {
  it("maps ship slot flags to fitting sections", () => {
    expect(assetSection("HiSlot0").label).toBe("High Slots");
    expect(assetSection("MedSlot3").label).toBe("Mid Slots");
    expect(assetSection("LoSlot7").label).toBe("Low Slots");
    expect(assetSection("RigSlot0").label).toBe("Rig Slots");
    expect(assetSection("SubSystemSlot1").label).toBe("Subsystems");
  });

  it("maps bays and holds to friendly names", () => {
    expect(assetSection("Cargo")).toMatchObject({ key: "cargo", label: "Cargo Hold" });
    expect(assetSection("DroneBay").label).toBe("Drone Bay");
    expect(assetSection("FighterTube0").label).toBe("Fighter Bay");
    expect(assetSection("SpecializedOreHold").label).toBe("Ore Hold");
  });

  it("buckets generic hangar and container flags", () => {
    expect(assetSection("Hangar").key).toBe("hangar");
    expect(assetSection("Unlocked").key).toBe("contents");
    expect(assetSection("Locked").key).toBe("contents");
  });

  it("maps the remaining named station/ship sections", () => {
    expect(assetSection("Deliveries").label).toBe("Deliveries");
    expect(assetSection("AssetSafety").label).toBe("Asset Safety");
    expect(assetSection("ShipHangar").label).toBe("Ship Hangar");
    expect(assetSection("FleetHangar").label).toBe("Fleet Hangar");
    expect(assetSection("FighterBay").label).toBe("Fighter Bay");
    expect(assetSection("ServiceSlot0").label).toBe("Service Slots");
  });
});

describe("humanizeFlag", () => {
  it("splits camelCase and strips the Specialized prefix", () => {
    expect(humanizeFlag("StructureFuel")).toBe("Structure Fuel");
    expect(humanizeFlag("SpecializedAmmoHold")).toBe("Ammo Hold");
  });

  it("strips trailing digits, e.g. the numbered corp hangars", () => {
    expect(humanizeFlag("CorpSAG1")).toBe("Corp SAG");
    expect(humanizeFlag("CorpSAG7")).toBe("Corp SAG");
    // A flag that is only digits falls back to the raw flag.
    expect(humanizeFlag("123")).toBe("123");
  });
});

describe("groupBySection", () => {
  const valueOf = (id: number) => id; // higher item_id = higher value

  it("orders sections like a ship fit and sorts items by value", () => {
    const items = [
      asset({ item_id: 1, type_id: 1, quantity: 1, location_id: SHIP, location_flag: "Cargo", location_type: "item" }),
      asset({ item_id: 2, type_id: 2, quantity: 1, location_id: SHIP, location_flag: "HiSlot0", location_type: "item" }),
      asset({ item_id: 3, type_id: 3, quantity: 1, location_id: SHIP, location_flag: "HiSlot1", location_type: "item" }),
    ];
    const groups = groupBySection(items, valueOf);
    expect(groups.map((g) => g.key)).toEqual(["hi", "cargo"]);
    // Both high-slot modules land in one section, most valuable first.
    expect(groups[0]?.items.map((i) => i.item_id)).toEqual([3, 2]);
    expect(isFlatSectioning(groups)).toBe(false);
  });

  it("flattens a single generic hangar group", () => {
    const items = [
      asset({ item_id: 1, type_id: 1, quantity: 1, location_id: JITA, location_flag: "Hangar", location_type: "station" }),
      asset({ item_id: 2, type_id: 2, quantity: 1, location_id: JITA, location_flag: "Hangar", location_type: "station" }),
    ];
    expect(isFlatSectioning(groupBySection(items, valueOf))).toBe(true);
    expect(isFlatSectioning([])).toBe(true);
  });
});
