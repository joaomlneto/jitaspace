import type { ColonyLayout, ColonyPin } from "@jitaspace/hooks";

import type {
  PiCatalog,
  PiSchematic,
} from "~/components/PlanetaryInteraction/catalog";

// A miniature PI catalog: a raw resource refined to P1, two P1s combined into
// a P2, and the pin types a colony is built from.
export const AQUEOUS_LIQUIDS = 2268;
export const IONIC_SOLUTIONS = 2309;
export const WATER = 3645;
export const ELECTROLYTES = 2390;
export const COOLANT = 9832;

export const COMMAND_CENTER = 2254;
export const ECU = 3060;
export const BASIC_PROCESSOR = 2473;
export const ADVANCED_PROCESSOR = 2474;
export const STORAGE = 2541;
export const LAUNCHPAD = 2544;

export const WATER_SCHEMATIC: PiSchematic = {
  schematicId: 121,
  name: "Water",
  cycleTime: 1800,
  inputs: [{ typeId: AQUEOUS_LIQUIDS, quantity: 3000 }],
  output: { typeId: WATER, quantity: 20 },
  pinTypeIds: [BASIC_PROCESSOR],
};

export const ELECTROLYTES_SCHEMATIC: PiSchematic = {
  schematicId: 125,
  name: "Electrolytes",
  cycleTime: 1800,
  inputs: [{ typeId: IONIC_SOLUTIONS, quantity: 3000 }],
  output: { typeId: ELECTROLYTES, quantity: 20 },
  pinTypeIds: [BASIC_PROCESSOR],
};

export const COOLANT_SCHEMATIC: PiSchematic = {
  schematicId: 66,
  name: "Coolant",
  cycleTime: 3600,
  inputs: [
    { typeId: ELECTROLYTES, quantity: 40 },
    { typeId: WATER, quantity: 40 },
  ],
  output: { typeId: COOLANT, quantity: 5 },
  pinTypeIds: [ADVANCED_PROCESSOR],
};

const type = (
  typeId: number,
  name: string,
  groupId: number,
  groupName: string,
  tier: number | null,
) => ({ typeId, name, groupId, groupName, tier });

export const CATALOG: PiCatalog = {
  schematics: [COOLANT_SCHEMATIC, ELECTROLYTES_SCHEMATIC, WATER_SCHEMATIC],
  types: {
    [AQUEOUS_LIQUIDS]: type(
      AQUEOUS_LIQUIDS,
      "Aqueous Liquids",
      1033,
      "Planet Liquid-Gas - Raw Materials",
      0,
    ),
    [IONIC_SOLUTIONS]: type(
      IONIC_SOLUTIONS,
      "Ionic Solutions",
      1033,
      "Planet Liquid-Gas - Raw Materials",
      0,
    ),
    [WATER]: type(WATER, "Water", 1042, "Basic Commodities - Tier 1", 1),
    [ELECTROLYTES]: type(
      ELECTROLYTES,
      "Electrolytes",
      1042,
      "Basic Commodities - Tier 1",
      1,
    ),
    [COOLANT]: type(
      COOLANT,
      "Coolant",
      1034,
      "Refined Commodities - Tier 2",
      2,
    ),
    [COMMAND_CENTER]: type(
      COMMAND_CENTER,
      "Barren Command Center",
      1027,
      "Command Centers",
      null,
    ),
    [ECU]: type(
      ECU,
      "Barren Extractor Control Unit",
      1063,
      "Extractor Control Units",
      null,
    ),
    [BASIC_PROCESSOR]: type(
      BASIC_PROCESSOR,
      "Barren Basic Industry Facility",
      1028,
      "Processors",
      null,
    ),
    [ADVANCED_PROCESSOR]: type(
      ADVANCED_PROCESSOR,
      "Barren Advanced Industry Facility",
      1028,
      "Processors",
      null,
    ),
    [STORAGE]: type(
      STORAGE,
      "Barren Storage Facility",
      1029,
      "Storage Facilities",
      null,
    ),
    [LAUNCHPAD]: type(LAUNCHPAD, "Barren Launchpad", 1030, "Spaceports", null),
  },
};

export const NOW = Date.parse("2026-11-01T12:00:00Z");
export const HOUR = 60 * 60 * 1000;
const iso = (time: number) => new Date(time).toISOString();

let nextPinId = 1;
export const pin = (overrides: Partial<ColonyPin>): ColonyPin => ({
  pin_id: nextPinId++,
  type_id: COMMAND_CENTER,
  latitude: 1.5,
  longitude: 0.5,
  ...overrides,
});

export const extractor = ({
  product = AQUEOUS_LIQUIDS,
  expiresIn,
  installedAgo = 72 * HOUR,
  qtyPerCycle = 6000,
  cycleTime = 1800,
}: {
  product?: number;
  expiresIn?: number;
  installedAgo?: number;
  qtyPerCycle?: number;
  cycleTime?: number;
}) =>
  pin({
    type_id: ECU,
    install_time: iso(NOW - installedAgo),
    expiry_time: expiresIn === undefined ? undefined : iso(NOW + expiresIn),
    extractor_details: {
      product_type_id: product,
      qty_per_cycle: qtyPerCycle,
      cycle_time: cycleTime,
      heads: [
        { head_id: 0, latitude: 1.5, longitude: 0.5 },
        { head_id: 1, latitude: 1.51, longitude: 0.51 },
      ],
    },
  });

export const factory = (schematicId: number) =>
  pin({
    type_id: BASIC_PROCESSOR,
    schematic_id: schematicId,
    last_cycle_start: iso(NOW - HOUR),
  });

export const layout = (pins: ColonyPin[]): ColonyLayout => ({
  pins,
  links: [],
  routes: [],
});

export const colony = (
  characterId: number,
  planetId: number,
  overrides: Record<string, unknown> = {},
) => ({
  subjectId: characterId,
  owner_id: characterId,
  planet_id: planetId,
  planet_type: "barren" as const,
  solar_system_id: 30000142,
  upgrade_level: 4,
  num_pins: 10,
  last_update: iso(NOW - 2 * HOUR),
  ...overrides,
});
