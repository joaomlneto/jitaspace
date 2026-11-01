import { describe, expect, it } from "@jest/globals";

import type { PiSchematic } from "~/components/PlanetaryInteraction/catalog";
import {
  commodityTiers,
  perHour,
  pinKindOf,
  pinSchematicId,
  schematicsByInput,
  schematicsByOutput,
  tierLabel,
} from "~/components/PlanetaryInteraction/catalog";
import {
  aggregateProduction,
  colonyRowKey,
  colonyTotals,
  compareColonyStatus,
  EXPIRING_SOON_MS,
  extractorStatus,
  formatDuration,
  formatRelative,
  parseColonyRowKey,
  summarizeColony,
  toColonyRows,
  toExtractorRows,
  toStorageRows,
} from "~/components/PlanetaryInteraction/colonies";
import {
  accessSummary,
  customsOfficeTotals,
  reinforceWindow,
  standingTaxRate,
} from "~/components/PlanetaryInteraction/customsOffices";
import {
  formatCycleTime,
  schematicAnchorId,
  schematicEntries,
  schematicMatches,
} from "~/components/PlanetaryInteraction/schematics";
import {
  AQUEOUS_LIQUIDS,
  BASIC_PROCESSOR,
  CATALOG,
  colony,
  COMMAND_CENTER,
  COOLANT,
  COOLANT_SCHEMATIC,
  ELECTROLYTES,
  extractor,
  factory,
  HOUR,
  IONIC_SOLUTIONS,
  LAUNCHPAD,
  layout,
  NOW,
  pin,
  STORAGE,
  WATER,
  WATER_SCHEMATIC,
} from "./planetaryInteractionFixtures";

describe("pinKindOf", () => {
  it("trusts ESI's details over the catalog", () => {
    expect(pinKindOf(extractor({ expiresIn: HOUR }), {})).toBe("extractor");
    expect(pinKindOf(pin({ schematic_id: 121 }), {})).toBe("processor");
    expect(pinKindOf(pin({ factory_details: { schematic_id: 121 } }), {})).toBe(
      "processor",
    );
  });

  it("tells the other structures apart by their group", () => {
    expect(pinKindOf(pin({ type_id: COMMAND_CENTER }), CATALOG.types)).toBe(
      "command_center",
    );
    expect(pinKindOf(pin({ type_id: STORAGE }), CATALOG.types)).toBe("storage");
    expect(pinKindOf(pin({ type_id: LAUNCHPAD }), CATALOG.types)).toBe(
      "launchpad",
    );
    // An idle processor has no schematic, so only its group says what it is.
    expect(pinKindOf(pin({ type_id: BASIC_PROCESSOR }), CATALOG.types)).toBe(
      "processor",
    );
  });

  it("falls back to other for a type the catalog does not know", () => {
    expect(pinKindOf(pin({ type_id: 1 }), CATALOG.types)).toBe("other");
    expect(pinKindOf(pin({ type_id: COOLANT }), CATALOG.types)).toBe("other");
  });

  it("reads the schematic from either field", () => {
    expect(pinSchematicId({ schematic_id: 1 })).toBe(1);
    expect(pinSchematicId({ factory_details: { schematic_id: 2 } })).toBe(2);
    expect(pinSchematicId({})).toBeUndefined();
  });
});

describe("commodityTiers", () => {
  it("derives tiers from the schematic graph", () => {
    const tiers = commodityTiers(CATALOG.schematics);
    expect(tiers.get(AQUEOUS_LIQUIDS)).toBe(0);
    expect(tiers.get(WATER)).toBe(1);
    expect(tiers.get(COOLANT)).toBe(2);
  });

  it("puts a product one tier above its highest input", () => {
    // A P4 made from a P3 and a P1, as EVE's are.
    const schematics: PiSchematic[] = [
      { ...WATER_SCHEMATIC },
      {
        ...COOLANT_SCHEMATIC,
        schematicId: 1,
        output: { typeId: 100, quantity: 1 },
        inputs: [{ typeId: WATER, quantity: 1 }],
      },
      {
        ...COOLANT_SCHEMATIC,
        schematicId: 2,
        output: { typeId: 200, quantity: 1 },
        inputs: [{ typeId: 100, quantity: 1 }],
      },
      {
        ...COOLANT_SCHEMATIC,
        schematicId: 3,
        output: { typeId: 300, quantity: 1 },
        inputs: [
          { typeId: 200, quantity: 1 },
          { typeId: WATER, quantity: 1 },
        ],
      },
    ];
    const tiers = commodityTiers(schematics);
    expect(tiers.get(200)).toBe(3);
    expect(tiers.get(300)).toBe(4);
  });

  it("does not recurse forever on a cycle", () => {
    const loop = (output: number, input: number): PiSchematic => ({
      ...WATER_SCHEMATIC,
      schematicId: output,
      output: { typeId: output, quantity: 1 },
      inputs: [{ typeId: input, quantity: 1 }],
    });
    const tiers = commodityTiers([loop(1, 2), loop(2, 1)]);
    expect(tiers.get(1)).toBeGreaterThan(0);
    expect(tiers.get(2)).toBeGreaterThan(0);
  });

  it("labels tiers", () => {
    expect(tierLabel(2)).toBe("P2");
    expect(tierLabel(null)).toBe("—");
  });

  it("indexes schematics by what they make and consume", () => {
    expect(schematicsByOutput(CATALOG.schematics).get(COOLANT)).toBe(
      COOLANT_SCHEMATIC,
    );
    expect(schematicsByInput(CATALOG.schematics).get(WATER)).toEqual([
      COOLANT_SCHEMATIC,
    ]);
  });

  it("converts a cycle to an hourly rate", () => {
    expect(perHour(20, 1800)).toBe(40);
    expect(perHour(20, 0)).toBe(0);
  });
});

describe("extractorStatus", () => {
  it.each([
    [undefined, "idle"],
    [-1, "expired"],
    [0, "expired"],
    [EXPIRING_SOON_MS, "expiring"],
    [EXPIRING_SOON_MS + 1, "running"],
  ] as const)("expiry in %p ms is %s", (offset, status) => {
    expect(
      extractorStatus(offset === undefined ? undefined : NOW + offset, NOW),
    ).toBe(status);
  });

  it("orders statuses most urgent first", () => {
    const sorted = (["none", "running", "idle", "expired", "expiring"] as const)
      .slice()
      .sort(compareColonyStatus);
    expect(sorted).toEqual(["expired", "expiring", "idle", "running", "none"]);
  });
});

describe("summarizeColony", () => {
  it("summarises extractors, factories and storage", () => {
    const summary = summarizeColony(
      layout([
        pin({
          type_id: COMMAND_CENTER,
          contents: [{ type_id: WATER, amount: 100 }],
        }),
        extractor({ expiresIn: 48 * HOUR, installedAgo: 48 * HOUR }),
        extractor({ product: IONIC_SOLUTIONS, expiresIn: 2 * HOUR }),
        factory(WATER_SCHEMATIC.schematicId),
        pin({
          type_id: STORAGE,
          contents: [
            { type_id: WATER, amount: 50 },
            { type_id: AQUEOUS_LIQUIDS, amount: 1000 },
          ],
        }),
        // A processor's contents are its next cycle's inputs, not stock.
        pin({
          type_id: BASIC_PROCESSOR,
          schematic_id: WATER_SCHEMATIC.schematicId,
          contents: [{ type_id: AQUEOUS_LIQUIDS, amount: 3000 }],
        }),
      ]),
      CATALOG,
      NOW,
    );

    expect(summary.extractors).toHaveLength(2);
    expect(summary.extractors[0]).toMatchObject({
      productTypeId: AQUEOUS_LIQUIDS,
      status: "running",
      perHour: 12000,
      headCount: 2,
      progress: 0.5,
    });
    expect(summary.status).toBe("expiring");
    expect(summary.nextExpiry).toBe(NOW + 2 * HOUR);
    expect(summary.factories).toHaveLength(2);
    expect(summary.factories[0]).toMatchObject({
      schematic: WATER_SCHEMATIC,
      outputPerHour: 40,
    });
    expect(summary.storage).toEqual([
      { typeId: AQUEOUS_LIQUIDS, amount: 1000 },
      { typeId: WATER, amount: 150 },
    ]);
    expect(summary.pinCounts).toMatchObject({
      command_center: 1,
      extractor: 2,
      processor: 2,
      storage: 1,
    });
  });

  it("reports a factory planet as having no extractors", () => {
    const summary = summarizeColony(
      layout([pin({ type_id: COMMAND_CENTER }), factory(9999)]),
      CATALOG,
      NOW,
    );
    expect(summary.status).toBe("none");
    expect(summary.nextExpiry).toBeUndefined();
    // A schematic the catalog does not know still counts as a factory.
    expect(summary.factories[0]).toMatchObject({
      schematicId: 9999,
      schematic: undefined,
      outputPerHour: 0,
    });
  });

  it("takes the most urgent extractor's status", () => {
    const summary = summarizeColony(
      layout([
        extractor({ expiresIn: 72 * HOUR }),
        extractor({ expiresIn: -HOUR }),
      ]),
      CATALOG,
      NOW,
    );
    expect(summary.status).toBe("expired");
    // An ended program is not an upcoming expiry.
    expect(summary.nextExpiry).toBe(NOW + 72 * HOUR);
  });

  it("leaves progress undefined without both ends of a program", () => {
    const summary = summarizeColony(
      layout([
        pin({
          type_id: 3060,
          extractor_details: { heads: [] },
          install_time: "not a date",
        }),
      ]),
      CATALOG,
      NOW,
    );
    expect(summary.extractors[0]).toMatchObject({
      status: "idle",
      progress: undefined,
      perHour: 0,
      headCount: 0,
    });
  });
});

describe("colony rows", () => {
  const colonies = [colony(1, 10), colony(1, 11), colony(2, 20)];
  const layouts = {
    "1:10": layout([extractor({ expiresIn: 2 * HOUR })]),
    "2:20": layout([
      extractor({ product: IONIC_SOLUTIONS, expiresIn: 50 * HOUR }),
      factory(WATER_SCHEMATIC.schematicId),
      pin({
        type_id: STORAGE,
        contents: [{ type_id: WATER, amount: 5 }],
      }),
    ]),
  };

  it("joins each colony to its layout and tracks the rest", () => {
    const rows = toColonyRows(
      colonies,
      layouts,
      new Set(["1:11"]),
      CATALOG,
      NOW,
    );
    expect(rows.map((row) => [row.key, row.layoutState])).toEqual([
      ["1:10", "ready"],
      ["1:11", "error"],
      ["2:20", "ready"],
    ]);
    expect(rows[0]?.summary?.status).toBe("expiring");
  });

  it("keeps loading without a clock rather than guessing at expiry", () => {
    const rows = toColonyRows(colonies, layouts, new Set(), CATALOG, null);
    expect(rows.every((row) => row.layoutState === "loading")).toBe(true);
    expect(rows.every((row) => row.summary === undefined)).toBe(true);
  });

  it("lists extractors and storage with their colony", () => {
    const rows = toColonyRows(colonies, layouts, new Set(), CATALOG, NOW);
    const extractors = toExtractorRows(rows);
    expect(extractors).toHaveLength(2);
    expect(extractors[1]).toMatchObject({
      colonyKey: "2:20",
      characterId: 2,
      planetId: 20,
      planetType: "barren",
      solarSystemId: 30000142,
    });
    expect(toStorageRows(rows, CATALOG)).toEqual([
      expect.objectContaining({
        key: `2:20:${WATER}`,
        typeId: WATER,
        amount: 5,
        tier: 1,
      }),
    ]);
  });

  it("totals the colonies shown", () => {
    const rows = toColonyRows(colonies, layouts, new Set(), CATALOG, NOW);
    expect(colonyTotals(rows)).toEqual({
      colonies: 3,
      characters: 2,
      extractors: 2,
      byStatus: { expired: 0, expiring: 1, running: 1, idle: 0 },
      factories: 1,
      nextExpiry: NOW + 2 * HOUR,
    });
  });

  it("round-trips its key", () => {
    expect(parseColonyRowKey(colonyRowKey(90000001, 40000002))).toEqual({
      characterId: 90000001,
      planetId: 40000002,
    });
    expect(parseColonyRowKey("1:x")).toBeNull();
    expect(parseColonyRowKey(null)).toBeNull();
  });
});

describe("aggregateProduction", () => {
  it("nets extraction and production against what factories consume", () => {
    const rows = toColonyRows(
      [colony(1, 10)],
      {
        "1:10": layout([
          extractor({ expiresIn: 10 * HOUR, qtyPerCycle: 3000 }),
          // Expired and idle programs produce nothing.
          extractor({ expiresIn: -HOUR }),
          pin({ type_id: 3060, extractor_details: { heads: [] } }),
          factory(WATER_SCHEMATIC.schematicId),
          factory(9999),
        ]),
      },
      new Set(),
      CATALOG,
      NOW,
    );

    const production = aggregateProduction(rows, CATALOG);
    const byType = Object.fromEntries(
      production.map((row) => [row.typeId, row]),
    );

    expect(byType[AQUEOUS_LIQUIDS]).toMatchObject({
      extractedPerHour: 6000,
      consumedPerHour: 6000,
      netPerHour: 0,
      tier: 0,
      colonies: 1,
    });
    expect(byType[WATER]).toMatchObject({
      producedPerHour: 40,
      netPerHour: 40,
      tier: 1,
    });
    // Sorted by surplus.
    expect(production[0]?.typeId).toBe(WATER);
  });

  it("shows a shortfall when factories need more than is made", () => {
    const rows = toColonyRows(
      [colony(1, 10)],
      { "1:10": layout([factory(COOLANT_SCHEMATIC.schematicId)]) },
      new Set(),
      CATALOG,
      NOW,
    );
    const production = aggregateProduction(rows, CATALOG);
    expect(
      production.find((row) => row.typeId === ELECTROLYTES)?.netPerHour,
    ).toBe(-40);
  });
});

describe("durations", () => {
  it.each([
    [30 * 1000, "0m"],
    [45 * 60 * 1000, "45m"],
    [3 * HOUR + 12 * 60 * 1000, "3h 12m"],
    [52 * HOUR, "2d 4h"],
    [-HOUR, "0m"],
  ])("formats %p ms as %s", (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });

  it("formats relative to now", () => {
    expect(formatRelative(NOW + HOUR, NOW)).toBe("in 1h 0m");
    expect(formatRelative(NOW - 25 * HOUR, NOW)).toBe("1d 1h ago");
  });
});

describe("customs offices", () => {
  const office = {
    office_id: 1,
    subjectId: 98000001,
    system_id: 30000142,
    allow_access_with_standings: true,
    allow_alliance_access: true,
    alliance_tax_rate: 0.05,
    corporation_tax_rate: 0.02,
    standing_level: "neutral" as const,
    neutral_standing_tax_rate: 0.1,
    good_standing_tax_rate: 0.08,
    reinforce_exit_start: 6,
    reinforce_exit_end: 8,
  };

  it("reads standing taxes only when standings grant access", () => {
    expect(standingTaxRate(office, "neutral")).toBe(0.1);
    expect(standingTaxRate(office, "bad")).toBeUndefined();
    expect(
      standingTaxRate(
        { ...office, allow_access_with_standings: false },
        "neutral",
      ),
    ).toBeUndefined();
  });

  it("describes who may use it", () => {
    expect(accessSummary(office)).toBe(
      "Corporation, alliance, neutral standing or better",
    );
    expect(
      accessSummary({
        ...office,
        allow_alliance_access: false,
        allow_access_with_standings: false,
      }),
    ).toBe("Corporation");
  });

  it("writes the reinforcement window in UTC hours", () => {
    expect(reinforceWindow(office)).toBe("06:00–08:00");
  });

  it("totals the offices shown", () => {
    expect(
      customsOfficeTotals([
        office,
        {
          ...office,
          office_id: 2,
          corporation_tax_rate: 0.04,
          allow_alliance_access: false,
          allow_access_with_standings: false,
        },
        {
          ...office,
          office_id: 3,
          system_id: 1,
          corporation_tax_rate: undefined,
        },
      ]),
    ).toEqual({
      offices: 3,
      systems: 2,
      corporations: 1,
      allianceAccess: 2,
      standingAccess: 2,
      averageCorporationTax: 0.03,
    });
    expect(customsOfficeTotals([]).averageCorporationTax).toBeUndefined();
  });
});

describe("schematics", () => {
  it("annotates each schematic with its tier, rate and consumers", () => {
    const entries = schematicEntries(CATALOG);
    const water = entries.find((entry) => entry.schematicId === 121);
    expect(water).toMatchObject({
      tier: 1,
      outputPerHour: 40,
      usedBy: [COOLANT_SCHEMATIC],
    });
    expect(entries.find((entry) => entry.schematicId === 66)?.usedBy).toEqual(
      [],
    );
  });

  it("handles a schematic without an output", () => {
    const [entry] = schematicEntries({
      ...CATALOG,
      schematics: [{ ...WATER_SCHEMATIC, output: null }],
    });
    expect(entry).toMatchObject({ tier: null, usedBy: [], outputPerHour: 0 });
  });

  it("matches the schematic name or any commodity it touches", () => {
    expect(schematicMatches(COOLANT_SCHEMATIC, CATALOG, "")).toBe(true);
    expect(schematicMatches(COOLANT_SCHEMATIC, CATALOG, "cool")).toBe(true);
    expect(schematicMatches(COOLANT_SCHEMATIC, CATALOG, " WATER ")).toBe(true);
    expect(schematicMatches(COOLANT_SCHEMATIC, CATALOG, "ionic")).toBe(false);
  });

  it.each([
    [1800, "30 min"],
    [3600, "1 h"],
    [9000, "2 h 30 min"],
    [20, "20 s"],
  ])("formats a %p s cycle as %s", (seconds, text) => {
    expect(formatCycleTime(seconds)).toBe(text);
  });

  it("anchors each schematic", () => {
    expect(schematicAnchorId(65)).toBe("schematic-65");
  });
});
