import type { FactionIdentifier } from "@eve-online-tools/eve-ship-tree";

export interface ShipTreeFaction {
  /** The EVE faction id the library keys its layouts by. */
  readonly id: FactionIdentifier;
  /**
   * URL-safe key for `?faction=`. Ours rather than the library's, so shared
   * links keep working if the library renames or renumbers anything.
   */
  readonly slug: string;
  readonly name: string;
}

/**
 * Every faction the library can draw a ship tree for, alphabetically by name,
 * which is the order pickers list them in.
 *
 * All 17 render a full tree. The library's README said only the four empires
 * had layouts until 0.3.0, and was stale about it for every version before.
 */
export const SHIP_TREE_FACTIONS = [
  { id: 500003, slug: "amarr", name: "Amarr Empire" },
  { id: 500011, slug: "angel-cartel", name: "Angel Cartel" },
  { id: 500012, slug: "blood-raiders", name: "Blood Raider Covenant" },
  { id: 500001, slug: "caldari", name: "Caldari State" },
  { id: 500006, slug: "concord", name: "CONCORD Assembly" },
  { id: 500029, slug: "deathless-circle", name: "Deathless Circle" },
  { id: 500027, slug: "edencom", name: "EDENCOM" },
  { id: 500004, slug: "gallente", name: "Gallente Federation" },
  { id: 500010, slug: "guristas", name: "Guristas Pirates" },
  { id: 500002, slug: "minmatar", name: "Minmatar Republic" },
  { id: 500018, slug: "mordus-legion", name: "Mordu's Legion Command" },
  { id: 500014, slug: "ore", name: "ORE" },
  { id: 500019, slug: "sanshas-nation", name: "Sansha's Nation" },
  { id: 500020, slug: "serpentis", name: "Serpentis" },
  { id: 500016, slug: "sisters-of-eve", name: "Servant Sisters of EVE" },
  {
    id: 500017,
    slug: "society-of-conscious-thought",
    name: "The Society of Conscious Thought",
  },
  { id: 500026, slug: "triglavian", name: "Triglavian Collective" },
] as const satisfies readonly ShipTreeFaction[];

export type ShipTreeFactionSlug = (typeof SHIP_TREE_FACTIONS)[number]["slug"];

/** The slugs in alphabetical order, ready for `nuqs`'s `parseAsStringLiteral`. */
export const SHIP_TREE_FACTION_SLUGS: readonly ShipTreeFactionSlug[] =
  SHIP_TREE_FACTIONS.map((faction) => faction.slug);

export const DEFAULT_SHIP_TREE_FACTION_SLUG: ShipTreeFactionSlug = "caldari";

// Fails to compile if a library upgrade adds a faction this list doesn't know,
// so the picker can't silently omit it.
type MissingFactionId = Exclude<
  FactionIdentifier,
  (typeof SHIP_TREE_FACTIONS)[number]["id"]
>;
const _everyFactionIsListed: [MissingFactionId] extends [never] ? true : never =
  true;

const FACTIONS_BY_ID = new Map<FactionIdentifier, ShipTreeFaction>(
  SHIP_TREE_FACTIONS.map((faction) => [faction.id, faction]),
);
const FACTIONS_BY_SLUG = new Map<string, ShipTreeFaction>(
  SHIP_TREE_FACTIONS.map((faction) => [faction.slug, faction]),
);

export function getShipTreeFaction(id: FactionIdentifier): ShipTreeFaction {
  const faction = FACTIONS_BY_ID.get(id);
  if (!faction) throw new Error(`Unknown ship tree faction ${id}`);
  return faction;
}

export function getShipTreeFactionBySlug(
  slug: ShipTreeFactionSlug,
): ShipTreeFaction {
  const faction = FACTIONS_BY_SLUG.get(slug);
  if (!faction) throw new Error(`Unknown ship tree faction "${slug}"`);
  return faction;
}

/** Narrows an arbitrary string, such as a `<select>` value, to a faction slug. */
export function isShipTreeFactionSlug(
  value: string,
): value is ShipTreeFactionSlug {
  return FACTIONS_BY_SLUG.has(value);
}
