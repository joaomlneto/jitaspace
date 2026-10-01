import { describe, expect, it, jest } from "@jest/globals";

import type { CompareCatalog } from "~/components/Compare/catalog";
import type {
  CompareItemInput,
  CompareOptions,
} from "~/components/Compare/comparison";
import type * as ComparisonModule from "~/components/Compare/comparison";

// The real unit transforms, not the app-wide @jitaspace/ui stub: deltas are
// computed on displayed values, so the test must see the real conversion.
jest.mock("@jitaspace/ui", () =>
  jest.requireActual("../../../packages/ui/Text/DogmaAttributeValue"),
);

const { buildComparison, isVisibleAttribute } =
  require("~/components/Compare/comparison") as typeof ComparisonModule;

const catalog: Pick<
  CompareCatalog,
  "attributes" | "attributeCategories" | "unitSymbols"
> = {
  attributes: {
    4: { name: "mass", displayName: "Mass", categoryId: 4, published: true },
    9: {
      name: "hp",
      displayName: "Structure Hitpoints",
      categoryId: 4,
      unitId: 113,
      highIsGood: true,
      published: true,
    },
    12: {
      name: "lowSlots",
      displayName: "Low Slots",
      categoryId: 1,
      highIsGood: true,
      published: true,
    },
    37: {
      name: "maxVelocity",
      displayName: "Maximum Velocity",
      categoryId: 17,
      unitId: 11,
      highIsGood: true,
      published: true,
    },
    55: {
      name: "rechargeRate",
      displayName: "Capacitor Recharge time",
      categoryId: 5,
      unitId: 101,
      highIsGood: false,
      published: true,
    },
    182: {
      name: "requiredSkill1",
      displayName: "Primary Skill required",
      categoryId: 8,
      unitId: 116,
      highIsGood: true,
      published: true,
      defaultValue: 0,
    },
    271: {
      name: "shieldEmDamageResonance",
      displayName: "Shield EM Damage Resistance",
      categoryId: 2,
      unitId: 108,
      highIsGood: false,
      published: true,
    },
    277: { name: "requiredSkill1Level", categoryId: 8, highIsGood: true },
    283: {
      name: "droneCapacity",
      displayName: "Drone Capacity",
      categoryId: 10,
      unitId: 9,
      highIsGood: true,
      published: true,
      defaultValue: 0,
    },
    460: { name: "shipBonusMF", categoryId: 9, highIsGood: true },
    9999: { name: "mysteryAttribute", highIsGood: true, published: true },
  },
  attributeCategories: {
    1: "Fitting",
    2: "Shield",
    4: "Structure",
    5: "Capacitor",
    8: "Required Skills",
    10: "Drones",
    17: "Speed and Travel",
  },
  unitSymbols: { 9: "m3", 11: "m/sec", 101: "s", 113: "HP", 116: "typeID" },
};

const allRows: CompareOptions = {
  onlyDifferences: false,
  showHidden: false,
  filter: "",
};

const type = (
  attributes: Record<number, number>,
  fields: Partial<CompareItemInput["type"]> = {},
): CompareItemInput["type"] => ({
  dogma_attributes: Object.entries(attributes).map(([id, value]) => ({
    attribute_id: Number(id),
    value,
  })),
  ...fields,
});

const rifter: CompareItemInput = {
  typeId: 587,
  type: type(
    {
      4: 1067000,
      9: 350,
      12: 4,
      37: 365,
      55: 125000,
      182: 3329,
      271: 1,
      277: 1,
      460: -7.5,
    },
    { capacity: 140, mass: 1067000, volume: 27289, packaged_volume: 2500 },
  ),
  market: { buy: 255000, sell: 283000 },
};

const slasher: CompareItemInput = {
  typeId: 585,
  type: type(
    {
      4: 1075000,
      9: 300,
      12: 2,
      37: 430,
      55: 120000,
      182: 3329,
      271: 1,
      277: 1,
      283: 5,
      460: -5,
    },
    { capacity: 120, mass: 1075000, volume: 17400, packaged_volume: 2500 },
  ),
  market: { buy: 333000, sell: 0 },
};

function findRow(comparison: ReturnType<typeof buildComparison>, key: string) {
  for (const section of comparison.sections) {
    const row = section.rows.find((candidate) => candidate.key === key);
    if (row) return { section, row };
  }
  return undefined;
}

describe("buildComparison", () => {
  it("groups attribute rows by category in the preferred order", () => {
    const comparison = buildComparison([rifter, slasher], catalog, allRows);
    expect(comparison.sections.map((section) => section.label)).toEqual([
      "Market (Jita)",
      "Properties",
      "Fitting",
      "Shield",
      "Structure",
      "Capacitor",
      "Speed and Travel",
      "Drones",
      "Required Skills",
    ]);
  });

  it("uses the display name as the row label and keeps the internal name aside", () => {
    const { row } = findRow(
      buildComparison([rifter], catalog, allRows),
      "attribute:9",
    )!;
    expect(row.label).toBe("Structure Hitpoints");
    expect(row.name).toBe("hp");
    expect(row.unitSymbol).toBe("HP");
  });

  it("leaves out the dogma copies of mass, capacity and volume", () => {
    const comparison = buildComparison([rifter, slasher], catalog, allRows);
    expect(findRow(comparison, "attribute:4")).toBeUndefined();
    expect(findRow(comparison, "property:mass")).toBeDefined();
  });

  it("ranks by highIsGood and computes deltas against the baseline", () => {
    const { row } = findRow(
      buildComparison([rifter, slasher], catalog, allRows),
      "attribute:37",
    )!;
    expect(row.cells[0]).toMatchObject({ value: 365, rank: "worst" });
    expect(row.cells[1]).toMatchObject({ value: 430, rank: "best" });
    expect(row.cells[1]!.delta).toBeCloseTo(65 / 365);
    expect(row.cells[1]!.deltaIsBetter).toBe(true);
    expect(row.differs).toBe(true);
  });

  it("treats a lower value as better where highIsGood is false", () => {
    const { row } = findRow(
      buildComparison([rifter, slasher], catalog, allRows),
      "attribute:55",
    )!;
    expect(row.cells[0]!.rank).toBe("worst");
    expect(row.cells[1]!.rank).toBe("best");
    expect(row.cells[1]!.deltaIsBetter).toBe(true);
    // Milliseconds are compared as the seconds they are shown as.
    expect(row.cells[1]!.delta).toBeCloseTo(-5 / 125);
  });

  it("fills an unset attribute with its default, but neither ranks nor measures it", () => {
    const { row } = findRow(
      buildComparison([rifter, slasher], catalog, allRows),
      "attribute:283",
    )!;
    expect(row.cells[0]).toEqual({ value: 0, isDefault: true });
    // A single real value left: nothing to rank it against, and no baseline.
    expect(row.cells[1]).toEqual({ value: 5 });
    expect(row.differs).toBe(true);

    const reversed = findRow(
      buildComparison([slasher, rifter], catalog, allRows),
      "attribute:283",
    )!.row;
    expect(reversed.cells[1]).toEqual({ value: 0, isDefault: true });
  });

  it("treats listed costs as lower-is-better despite the SDE's flag", () => {
    const bandwidthCatalog = {
      ...catalog,
      attributes: {
        1272: {
          name: "droneBandwidthUsed",
          displayName: "Bandwidth Needed",
          categoryId: 10,
          unitId: 128,
          highIsGood: true,
          published: true,
        },
      },
    };
    const light: CompareItemInput = {
      typeId: 2456,
      type: type({ 1272: 5 }),
    };
    const heavy: CompareItemInput = {
      typeId: 2446,
      type: type({ 1272: 25 }),
    };
    const { row } = findRow(
      buildComparison([light, heavy], bandwidthCatalog, allRows),
      "attribute:1272",
    )!;
    expect(row.cells[0]!.rank).toBe("best");
    expect(row.cells[1]!.rank).toBe("worst");
    expect(row.cells[1]!.deltaIsBetter).toBe(false);
  });

  it("never fills an id-valued attribute with its default", () => {
    const withoutSkill: CompareItemInput = {
      typeId: 1,
      type: type({ 9: 100 }),
    };
    const { row } = findRow(
      buildComparison([withoutSkill, rifter], catalog, allRows),
      "attribute:182",
    )!;
    expect(row.cells[0]!.value).toBeUndefined();
    expect(row.cells[1]).toMatchObject({ value: 3329, level: 1 });
    expect(row.cells[1]!.rank).toBeUndefined();
  });

  it("gives percentages no delta but still ranks them", () => {
    const tanky: CompareItemInput = {
      typeId: 2,
      type: type({ 271: 0.5 }),
    };
    const { row } = findRow(
      buildComparison([rifter, tanky], catalog, allRows),
      "attribute:271",
    )!;
    expect(row.cells[1]).toMatchObject({ rank: "best" });
    expect(row.cells[1]!.delta).toBeUndefined();
  });

  it("does not rank where every value is the same", () => {
    const { row } = findRow(
      buildComparison([rifter, slasher], catalog, allRows),
      "attribute:182",
    )!;
    expect(row.differs).toBe(false);
    expect(row.cells.every((cell) => cell.rank === undefined)).toBe(true);
  });

  it("hides unpublished attributes unless asked", () => {
    const hidden = buildComparison([rifter], catalog, allRows);
    expect(findRow(hidden, "attribute:460")).toBeUndefined();
    const shown = buildComparison([rifter], catalog, {
      ...allRows,
      showHidden: true,
    });
    const { row, section } = findRow(shown, "attribute:460")!;
    expect(row.hidden).toBe(true);
    expect(row.label).toBe("shipBonusMF");
    expect(section.label).toBe("Other");
  });

  it("files attributes without a category under Other", () => {
    const odd: CompareItemInput = { typeId: 3, type: type({ 9999: 1 }) };
    const { section } = findRow(
      buildComparison([odd], catalog, { ...allRows, showHidden: true }),
      "attribute:9999",
    )!;
    expect(section.label).toBe("Other");
  });

  it("labels an attribute the catalog does not know by its id", () => {
    const unknown: CompareItemInput = { typeId: 4, type: type({ 123456: 1 }) };
    const { row } = findRow(
      buildComparison([unknown], catalog, { ...allRows, showHidden: true }),
      "attribute:123456",
    )!;
    expect(row.label).toBe("Attribute 123456");
    expect(row.hidden).toBe(true);
  });

  it("drops identical rows when only differences are wanted", () => {
    const comparison = buildComparison([rifter, slasher], catalog, {
      ...allRows,
      onlyDifferences: true,
    });
    expect(findRow(comparison, "attribute:182")).toBeUndefined();
    expect(findRow(comparison, "attribute:37")).toBeDefined();
    expect(comparison.identicalRows).toBeGreaterThan(0);
    expect(comparison.shownRows + comparison.identicalRows).toBe(
      comparison.totalRows,
    );
  });

  it("counts each section's rows before the filters", () => {
    const comparison = buildComparison([rifter, slasher], catalog, {
      ...allRows,
      onlyDifferences: true,
    });
    const market = comparison.sections.find((s) => s.key === "market")!;
    expect(market.rows).toHaveLength(2);
    expect(market.totalRows).toBe(2);
    const sell = buildComparison([rifter, slasher], catalog, {
      ...allRows,
      filter: "jita sell",
    }).sections;
    expect(sell).toHaveLength(1);
    expect(sell[0]!.rows).toHaveLength(1);
    expect(sell[0]!.totalRows).toBe(2);
  });

  it("ignores onlyDifferences for a single item", () => {
    const comparison = buildComparison([rifter], catalog, {
      ...allRows,
      onlyDifferences: true,
    });
    expect(comparison.identicalRows).toBe(0);
    expect(findRow(comparison, "attribute:182")).toBeDefined();
  });

  it("filters rows by label, internal name or section", () => {
    const byLabel = buildComparison([rifter], catalog, {
      ...allRows,
      filter: "velocity",
    });
    expect(byLabel.shownRows).toBe(1);

    const byName = buildComparison([rifter], catalog, {
      ...allRows,
      filter: "rechargeRate",
    });
    expect(findRow(byName, "attribute:55")).toBeDefined();

    const bySection = buildComparison([rifter], catalog, {
      ...allRows,
      filter: "market",
    });
    expect(bySection.sections.map((section) => section.key)).toEqual([
      "market",
    ]);
  });

  it("marks cells of an item still loading, and keeps their rows in view", () => {
    const loading: CompareItemInput = { typeId: 5 };
    const comparison = buildComparison([rifter, loading], catalog, {
      ...allRows,
      onlyDifferences: true,
    });
    const { row } = findRow(comparison, "attribute:9")!;
    expect(row.cells[1]).toEqual({ loading: true });
    // It may yet differ: hiding it would show an empty table, called
    // identical, until the item arrives.
    expect(row.differs).toBe(true);
    expect(comparison.identicalRows).toBe(0);
  });

  it("leaves the cells of an item that failed to load empty, not loading", () => {
    const failed: CompareItemInput = { typeId: 5, failed: true };
    const { row } = findRow(
      buildComparison([rifter, failed], catalog, allRows),
      "attribute:9",
    )!;
    expect(row.cells[1]).toEqual({});
  });

  it("prices the cheaper sell order best and hides a side with no orders", () => {
    const comparison = buildComparison([rifter, slasher], catalog, allRows);
    const sell = findRow(comparison, "market:sell")!.row;
    // Slasher has no sell orders, so only one price remains: nothing to rank.
    expect(sell.cells[1]!.value).toBeUndefined();
    expect(sell.cells[0]!.rank).toBeUndefined();
    const buy = findRow(comparison, "market:buy")!.row;
    expect(buy.isk).toBe(true);
    expect(buy.cells[1]!.delta).toBeCloseTo(78 / 255);
    expect(buy.cells[1]!.deltaIsBetter).toBeUndefined();
  });

  it("drops a row no item has a value for", () => {
    const noMarket: CompareItemInput = {
      ...rifter,
      market: { buy: 0, sell: 0 },
    };
    const comparison = buildComparison([noMarket], catalog, allRows);
    expect(comparison.sections.find((s) => s.key === "market")).toBeUndefined();
  });
});

describe("isVisibleAttribute", () => {
  it("needs both the published flag and a display name", () => {
    expect(isVisibleAttribute(undefined)).toBe(false);
    expect(isVisibleAttribute({ name: "x", published: true })).toBe(false);
    expect(
      isVisibleAttribute({ name: "x", displayName: "X", published: true }),
    ).toBe(true);
  });
});
