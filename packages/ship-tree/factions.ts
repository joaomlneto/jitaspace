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
 * Every faction the library can draw a ship tree for, in the order the
 * in-game picker lists them: the four empires first.
 *
 * The library's README says only the four empires have layouts. That is stale
 * for the version we ship (0.0.2): all 17 render a full tree.
 */
export const SHIP_TREE_FACTIONS = [
  { id: 500001, slug: "caldari", name: "Caldari State" },
  { id: 500002, slug: "minmatar", name: "Minmatar Republic" },
  { id: 500003, slug: "amarr", name: "Amarr Empire" },
  { id: 500004, slug: "gallente", name: "Gallente Federation" },
  { id: 500006, slug: "concord", name: "CONCORD Assembly" },
  { id: 500010, slug: "guristas", name: "Guristas Pirates" },
  { id: 500011, slug: "angel-cartel", name: "Angel Cartel" },
  { id: 500012, slug: "blood-raiders", name: "Blood Raider Covenant" },
  { id: 500014, slug: "ore", name: "ORE" },
  { id: 500016, slug: "sisters-of-eve", name: "Servant Sisters of EVE" },
  {
    id: 500017,
    slug: "society-of-conscious-thought",
    name: "The Society of Conscious Thought",
  },
  { id: 500018, slug: "mordus-legion", name: "Mordu's Legion Command" },
  { id: 500019, slug: "sanshas-nation", name: "Sansha's Nation" },
  { id: 500020, slug: "serpentis", name: "Serpentis" },
  { id: 500026, slug: "triglavian", name: "Triglavian Collective" },
  { id: 500027, slug: "edencom", name: "EDENCOM" },
  { id: 500029, slug: "deathless-circle", name: "Deathless Circle" },
] as const satisfies readonly ShipTreeFaction[];

export type ShipTreeFactionSlug = (typeof SHIP_TREE_FACTIONS)[number]["slug"];

/** The slugs in picker order, ready for `nuqs`'s `parseAsStringLiteral`. */
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
