/**
 * The compare tool's reference data: every item it can search for, plus the
 * SDE metadata needed to present any item's dogma attributes. Built on the
 * server from our own database (`readCompareCatalog`) and served as one static
 * JSON document, so searching and labelling cost no request per keystroke and
 * no ESI lookup per attribute.
 *
 * Why not ESI: its search endpoint needs a signed-in character holding the
 * `esi-search.search_structures.v1` scope, so anonymous visitors found nothing,
 * and its dogma attribute endpoint carries no category to group rows under.
 */

/** Where the catalog is served. */
export const COMPARE_CATALOG_URL = "/api/compare/catalog";

/**
 * Inventory categories whose items are worth comparing attribute by attribute:
 * ships, modules, charges, drones, implants, deployables, starbase structures,
 * subsystems, Upwell structures, structure modules and fighters. Everything
 * else is left out of search (blueprints and SKINs alone are 11k types that
 * would bury the hull a search is looking for), though any type id still
 * works when it arrives in the URL.
 */
export const COMPARABLE_CATEGORY_IDS: readonly number[] = [
  6, 7, 8, 18, 20, 22, 23, 32, 65, 66, 87,
];

/** Inventory category id of ship hulls. */
export const SHIP_CATEGORY_ID = 6;

/**
 * One searchable type: `[typeId, name, groupId, metaGroupId]`, with 0 for no
 * meta group. A tuple rather than an object because there are ~7,600 of them
 * and this is the bulk of the document.
 */
export type CatalogTypeRow = [
  typeId: number,
  name: string,
  groupId: number,
  metaGroupId: number,
];

export interface CatalogGroup {
  name: string;
  categoryId: number;
}

/** Presentation metadata for one dogma attribute. */
export interface CatalogAttribute {
  /** The internal name, e.g. `shieldCapacity`. */
  name: string;
  /** What the client shows, e.g. "Shield Capacity". Absent for internals. */
  displayName?: string;
  /** Dogma attribute category (Shield, Fitting, …) the row is grouped under. */
  categoryId?: number;
  unitId?: number;
  iconId?: number;
  /** The value an item has when it does not set the attribute itself. */
  defaultValue?: number;
  /** Whether a larger raw value is the better one. */
  highIsGood?: boolean;
  /** Whether the EVE client shows the attribute at all. */
  published?: boolean;
}

export interface CompareCatalog {
  types: CatalogTypeRow[];
  /** Keyed by group id; only the groups of `types`. */
  groups: Record<number, CatalogGroup>;
  /** Keyed by attribute id; every attribute, so types outside search resolve. */
  attributes: Record<number, CatalogAttribute>;
  /** Unit symbol ("m", "HP", "%"), keyed by dogma unit id. */
  unitSymbols: Record<number, string>;
  /** Dogma attribute category name, keyed by its id. */
  attributeCategories: Record<number, string>;
  /** Meta group name ("Tech II", "Faction", …), keyed by its id. */
  metaGroups: Record<number, string>;
}

export interface CatalogType {
  typeId: number;
  name: string;
  groupId: number;
  metaGroupId?: number;
}

/** The catalog with its type rows indexed for lookup. */
export interface IndexedCompareCatalog extends CompareCatalog {
  typesById: ReadonlyMap<number, CatalogType>;
  /** Type ids of each group, sorted by name. */
  typeIdsByGroup: ReadonlyMap<number, number[]>;
}

export function indexCompareCatalog(
  catalog: CompareCatalog,
): IndexedCompareCatalog {
  const typesById = new Map<number, CatalogType>();
  const typeIdsByGroup = new Map<number, number[]>();

  const sortedRows = catalog.types.toSorted((a, b) => a[1].localeCompare(b[1]));
  for (const [typeId, name, groupId, metaGroupId] of sortedRows) {
    typesById.set(typeId, {
      typeId,
      name,
      groupId,
      metaGroupId: metaGroupId === 0 ? undefined : metaGroupId,
    });
    const groupTypeIds = typeIdsByGroup.get(groupId);
    if (groupTypeIds) groupTypeIds.push(typeId);
    else typeIdsByGroup.set(groupId, [typeId]);
  }

  return { ...catalog, typesById, typeIdsByGroup };
}
