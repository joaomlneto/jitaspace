import type { ColonyPin } from "@jitaspace/hooks";

/** An amount of one commodity. */
export interface PiQuantity {
  typeId: number;
  quantity: number;
}

/** A planetary-industry schematic, from the SDE. */
export interface PiSchematic {
  schematicId: number;
  name: string;
  /** Seconds per run. */
  cycleTime: number;
  inputs: PiQuantity[];
  /** Every schematic makes exactly one commodity; null only if the SDE lists none. */
  output: PiQuantity | null;
  /** The processor types that can run it. */
  pinTypeIds: number[];
}

/** What the page knows about a commodity or a pin type without asking ESI. */
export interface PiTypeInfo {
  typeId: number;
  name: string;
  groupId: number;
  groupName: string;
  /**
   * P0 (raw) to P4 for commodities, derived from the schematics: a raw
   * resource is never a schematic's output, and anything else is one tier
   * above its highest input. Null for pin types.
   */
  tier: number | null;
}

/**
 * The SDE data the PI pages render with. The pages are static, so this is read
 * once on the server and shipped with the HTML; everything about a player's
 * colonies is fetched in the browser.
 */
export interface PiCatalog {
  schematics: PiSchematic[];
  /** Keyed by type id. Commodities and pin types only. */
  types: Record<number, PiTypeInfo>;
}

export const EMPTY_PI_CATALOG: PiCatalog = { schematics: [], types: {} };

/** The kinds of structure a colony is built from. */
export const PIN_KINDS = [
  "command_center",
  "extractor",
  "processor",
  "storage",
  "launchpad",
  "other",
] as const;
export type PinKind = (typeof PIN_KINDS)[number];

export const PIN_KIND_LABELS: Record<PinKind, string> = {
  command_center: "Command Center",
  extractor: "Extractor",
  processor: "Processor",
  storage: "Storage",
  launchpad: "Launchpad",
  other: "Other",
};

/**
 * Inventory groups of the "Planetary Industry" category (41). Group ids are
 * stable identifiers, not data: the names and types come from the catalog.
 */
export const PI_PIN_GROUP_KINDS: Record<number, PinKind> = {
  1027: "command_center",
  1063: "extractor",
  1028: "processor",
  1029: "storage",
  1030: "launchpad",
};

/** The inventory category holding every pin type. */
export const PI_PIN_CATEGORY_ID = 41;

/**
 * What a pin is. ESI's own details win, since they need no catalog: an
 * extractor carries `extractor_details` and a processor a schematic. The rest
 * (command centers, storage, launchpads) only differ by type.
 */
export function pinKindOf(
  pin: Pick<
    ColonyPin,
    "type_id" | "extractor_details" | "factory_details" | "schematic_id"
  >,
  types: PiCatalog["types"],
): PinKind {
  if (pin.extractor_details) return "extractor";
  if (pin.factory_details || pin.schematic_id !== undefined) return "processor";
  const groupId = types[pin.type_id]?.groupId;
  return (
    (groupId === undefined ? undefined : PI_PIN_GROUP_KINDS[groupId]) ?? "other"
  );
}

/** The schematic a processor pin is set to, if any. */
export const pinSchematicId = (
  pin: Pick<ColonyPin, "factory_details" | "schematic_id">,
): number | undefined => pin.schematic_id ?? pin.factory_details?.schematic_id;

/**
 * Each commodity's tier, derived from the schematics. See
 * {@link PiTypeInfo.tier}. A cycle in the graph (none exists in EVE) cannot
 * recurse forever: a type met again while its own tier is being worked out
 * counts as raw.
 */
export function commodityTiers(
  schematics: readonly PiSchematic[],
): Map<number, number> {
  const producedBy = new Map<number, PiSchematic>();
  const commodities = new Set<number>();
  for (const schematic of schematics) {
    for (const input of schematic.inputs) commodities.add(input.typeId);
    if (schematic.output) {
      commodities.add(schematic.output.typeId);
      producedBy.set(schematic.output.typeId, schematic);
    }
  }

  const tiers = new Map<number, number>();
  const visiting = new Set<number>();
  const tierOf = (typeId: number): number => {
    const known = tiers.get(typeId);
    if (known !== undefined) return known;
    const schematic = producedBy.get(typeId);
    if (!schematic || visiting.has(typeId)) return 0;
    visiting.add(typeId);
    const tier =
      1 + Math.max(0, ...schematic.inputs.map((input) => tierOf(input.typeId)));
    visiting.delete(typeId);
    tiers.set(typeId, tier);
    return tier;
  };

  for (const typeId of commodities) tiers.set(typeId, tierOf(typeId));
  return tiers;
}

/** "P0" to "P4". */
export const tierLabel = (tier: number | null | undefined) =>
  tier === null || tier === undefined ? "—" : `P${tier}`;

export const TIER_NAMES: Record<number, string> = {
  0: "Raw resources",
  1: "Basic commodities",
  2: "Refined commodities",
  3: "Specialized commodities",
  4: "Advanced commodities",
};

/** Index the schematics by the commodity they make. */
export function schematicsByOutput(
  schematics: readonly PiSchematic[],
): Map<number, PiSchematic> {
  const byOutput = new Map<number, PiSchematic>();
  for (const schematic of schematics) {
    if (schematic.output) byOutput.set(schematic.output.typeId, schematic);
  }
  return byOutput;
}

/** Index the schematics by each commodity they consume. */
export function schematicsByInput(
  schematics: readonly PiSchematic[],
): Map<number, PiSchematic[]> {
  const byInput = new Map<number, PiSchematic[]>();
  for (const schematic of schematics) {
    for (const input of schematic.inputs) {
      const list = byInput.get(input.typeId) ?? [];
      list.push(schematic);
      byInput.set(input.typeId, list);
    }
  }
  return byInput;
}

/** Units per hour, for something that makes `quantity` every `cycleTime` seconds. */
export const perHour = (quantity: number, cycleTime: number) =>
  cycleTime > 0 ? (quantity * 3600) / cycleTime : 0;
