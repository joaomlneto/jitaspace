import { z } from "zod";

/**
 * Reader-side schemas, types and display metadata for the change-history
 * viewer. The data is produced by the change-history pipeline and read from the
 * standalone history database via the server functions in `~/lib/history-actions`.
 *
 * `v` versions the payload; keep these shapes in sync with the producer.
 */

export const FieldDelta = z.object({
  from: z.unknown().optional(), // omitted ⇒ field did not exist before
  to: z.unknown().optional(), // omitted ⇒ field does not exist after
});
export type FieldDelta = z.infer<typeof FieldDelta>;

const Added = z.object({
  v: z.literal(1),
  kind: z.literal("added"),
  values: z.record(z.string(), z.unknown()).optional(),
});
const Modified = z.object({
  v: z.literal(1),
  kind: z.literal("modified"),
  fields: z.record(z.string(), FieldDelta),
});
const Removed = z.object({
  v: z.literal(1),
  kind: z.literal("removed"),
  // The entity's last-known snapshot before removal (pre-image). Present in data
  // generated with the composability fix; absent in older files.
  values: z.record(z.string(), z.unknown()).optional(),
});
export const EntityChange = z.union([Added, Modified, Removed]);
export type EntityChange = z.infer<typeof EntityChange>;

export const HistoryIndex = z.object({
  generatedAt: z.string(),
  /** Which collections were swept into this tree (absent ⇒ just "types"). */
  collections: z.array(z.string()).optional(),
  /** Entity kinds present ("type", "skin", "skinMaterial"). */
  entityTypes: z.array(z.string()),
  builds: z.array(
    z.object({
      build: z.number(),
      date: z.string().nullable(),
      changeCount: z.number(),
      /** Per-collection change counts for this build. */
      byCollection: z.record(z.string(), z.number()).optional(),
    }),
  ),
  /** entityIds with at least one event, per entity type, ascending. */
  entityIdsByType: z.record(z.string(), z.array(z.number())),
});
export type HistoryIndex = z.infer<typeof HistoryIndex>;

export const BuildChanges = z.object({
  build: z.number(),
  date: z.string().nullable(),
  changes: z.array(
    z.intersection(
      z.object({
        entityId: z.number(),
        // entity kind ("type", "skin", "skinMaterial"); absent ⇒ "type".
        entityType: z.string().optional(),
        // type-keyed dataset ("types", "typeDogma", …); absent ⇒ "types".
        collection: z.string().optional(),
      }),
      EntityChange,
    ),
  ),
});
export type BuildChanges = z.infer<typeof BuildChanges>;

export const TimelineEvent = z.intersection(
  z.object({
    build: z.number(),
    date: z.string().nullable(),
    collection: z.string().optional(), // absent ⇒ "types" (legacy files)
  }),
  EntityChange,
);
export type TimelineEvent = z.infer<typeof TimelineEvent>;

export const EntityTimeline = z.object({
  entityType: z.string(),
  entityId: z.number(),
  events: z.array(TimelineEvent),
});
export type EntityTimeline = z.infer<typeof EntityTimeline>;

/**
 * Most recent known value of a top-level field across an entity's timeline.
 * Events are stored oldest-first, so scan from the end: the first event that
 * mentions the field wins. A field whose latest mention removed it is treated
 * as absent. Useful for a header label (e.g. a skin's `internalName`).
 */
export function latestFieldValue(
  timeline: EntityTimeline | null | undefined,
  field: string,
): unknown {
  if (!timeline) return undefined;
  for (let i = timeline.events.length - 1; i >= 0; i--) {
    const e = timeline.events[i];
    if (!e) continue;
    if (e.kind === "added" && e.values && field in e.values)
      return e.values[field];
    if (e.kind === "modified" && field in e.fields) {
      const d = e.fields[field];
      return d && "to" in d ? d.to : undefined; // latest mention removed ⇒ absent
    }
  }
  return undefined;
}

// ── value formatting for display ───────────────────────────────────────────

/** Render a (possibly structured) field value to a short, human string. */
export function formatValue(v: unknown): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "bigint" || typeof v === "string") return String(v);
  if (typeof v === "object") {
    // localization objects ({ en, de, ... }) → prefer English
    const obj = v as Record<string, unknown>;
    if (typeof obj.en === "string") return obj.en;
    const json = JSON.stringify(v);
    return json.length > 80 ? json.slice(0, 77) + "…" : json;
  }
  return "—"; // symbol / function — never present in parsed JSON data
}

/** Whether a delta represents a field appearing, disappearing, or changing. */
export function deltaKind(d: FieldDelta): "added" | "removed" | "changed" {
  const hasFrom = "from" in d;
  const hasTo = "to" in d;
  if (!hasFrom) return "added";
  if (!hasTo) return "removed";
  return "changed";
}

// ── collection display metadata ─────────────────────────────────────────────

export const COLLECTION_META: Record<string, { label: string; color: string }> =
  {
    types: { label: "Type", color: "blue" },
    typeDogma: { label: "Dogma", color: "violet" },
    typeMaterials: { label: "Materials", color: "teal" },
    dynamicItemAttributes: { label: "Mutaplasmid", color: "grape" },
    requiredSkillsForTypes: { label: "Required skills", color: "cyan" },
    requiredSkillsIndex: { label: "Skill index", color: "indigo" },
    skinLicenses: { label: "Skin license", color: "orange" },
    skins: { label: "Skin", color: "pink" },
    skinMaterials: { label: "Skin material", color: "lime" },
    blueprints: { label: "Blueprint", color: "yellow" },
    contrabandTypes: { label: "Contraband", color: "red" },
    controlTowerResources: { label: "Tower fuel", color: "orange" },
    categories: { label: "Category", color: "blue" },
    groups: { label: "Group", color: "cyan" },
    marketGroups: { label: "Market group", color: "teal" },
    metaGroups: { label: "Meta group", color: "green" },
    dogmaAttributes: { label: "Dogma attribute", color: "violet" },
    dogmaAttributeCategories: { label: "Attribute category", color: "grape" },
    dogmaEffects: { label: "Dogma effect", color: "indigo" },
    dbuffCollections: { label: "Dbuff", color: "pink" },
    graphicIDs: { label: "Graphic", color: "lime" },
    iconIDs: { label: "Icon", color: "yellow" },
    factions: { label: "Faction", color: "red" },
    races: { label: "Race", color: "orange" },
    bloodlines: { label: "Bloodline", color: "grape" },
    ancestries: { label: "Ancestry", color: "pink" },
    corporationActivities: { label: "Corp activity", color: "teal" },
    npcCorporations: { label: "NPC corporation", color: "cyan" },
    npcCorporationDivisions: { label: "NPC corp division", color: "blue" },
    npcCharacters: { label: "NPC character", color: "indigo" },
    agentsInSpace: { label: "Agent in space", color: "green" },
    schematics: { label: "Schematic", color: "lime" },
    stationOperations: { label: "Station operation", color: "teal" },
    stationServices: { label: "Station service", color: "cyan" },
    regions: { label: "Region", color: "violet" },
    constellations: { label: "Constellation", color: "grape" },
    solarSystems: { label: "Solar system", color: "blue" },
    planets: { label: "Planet", color: "indigo" },
    moons: { label: "Moon", color: "gray" },
    asteroidBelts: { label: "Asteroid belt", color: "orange" },
    npcStations: { label: "Station", color: "cyan" },
    stars: { label: "Star", color: "yellow" },
    stargates: { label: "Stargate", color: "grape" },
    expertSystems: { label: "Expert system", color: "grape" },
    cloneGrades: { label: "Clone state", color: "teal" },
  };

/**
 * Display label for an entity kind (the `/history/{entityType}` dimension).
 * "type" is the default/implicit kind; skins & skin materials are separate.
 */
export const ENTITY_TYPE_META: Record<
  string,
  { label: string; plural: string }
> = {
  type: { label: "Type", plural: "Types" },
  skin: { label: "Skin", plural: "Skins" },
  skinMaterial: { label: "Skin material", plural: "Skin materials" },
  category: { label: "Category", plural: "Categories" },
  group: { label: "Group", plural: "Groups" },
  marketGroup: { label: "Market group", plural: "Market groups" },
  metaGroup: { label: "Meta group", plural: "Meta groups" },
  dogmaAttribute: { label: "Dogma attribute", plural: "Dogma attributes" },
  dogmaAttributeCategory: {
    label: "Attribute category",
    plural: "Attribute categories",
  },
  dogmaEffect: { label: "Dogma effect", plural: "Dogma effects" },
  dbuffCollection: { label: "Dbuff", plural: "Dbuffs" },
  graphic: { label: "Graphic", plural: "Graphics" },
  icon: { label: "Icon", plural: "Icons" },
  faction: { label: "Faction", plural: "Factions" },
  race: { label: "Race", plural: "Races" },
  bloodline: { label: "Bloodline", plural: "Bloodlines" },
  ancestry: { label: "Ancestry", plural: "Ancestries" },
  corporationActivity: {
    label: "Corp activity",
    plural: "Corp activities",
  },
  npcCorporation: { label: "NPC corporation", plural: "NPC corporations" },
  npcCorporationDivision: {
    label: "NPC corp division",
    plural: "NPC corp divisions",
  },
  npcCharacter: { label: "NPC character", plural: "NPC characters" },
  agentInSpace: { label: "Agent in space", plural: "Agents in space" },
  schematic: { label: "Schematic", plural: "Schematics" },
  stationOperation: {
    label: "Station operation",
    plural: "Station operations",
  },
  stationService: { label: "Station service", plural: "Station services" },
  region: { label: "Region", plural: "Regions" },
  constellation: { label: "Constellation", plural: "Constellations" },
  solarSystem: { label: "Solar system", plural: "Solar systems" },
  planet: { label: "Planet", plural: "Planets" },
  moon: { label: "Moon", plural: "Moons" },
  asteroidBelt: { label: "Asteroid belt", plural: "Asteroid belts" },
  npcStation: { label: "Station", plural: "Stations" },
  star: { label: "Star", plural: "Stars" },
  stargate: { label: "Stargate", plural: "Stargates" },
  cloneGrade: { label: "Clone state", plural: "Clone states" },
};

export function entityTypeMeta(entityType: string): {
  label: string;
  plural: string;
} {
  return (
    ENTITY_TYPE_META[entityType] ?? { label: entityType, plural: entityType }
  );
}

/** Display label + color for a change's collection (absent ⇒ "types"). */
export function collectionMeta(collection?: string): {
  label: string;
  color: string;
} {
  return (
    COLLECTION_META[collection ?? "types"] ?? {
      label: collection ?? "?",
      color: "gray",
    }
  );
}
