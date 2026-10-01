import type { CatalogType, IndexedCompareCatalog } from "./catalog";

/** Shortest query worth searching for. */
export const MIN_SEARCH_LENGTH = 2;

/** How strongly a type matched; lower sorts first. */
const MatchRank = {
  ExactName: 0,
  NamePrefix: 1,
  WordPrefix: 2,
  NameContains: 3,
  GroupMatch: 4,
} as const;
type MatchRank = (typeof MatchRank)[keyof typeof MatchRank];

function rankMatch(
  name: string,
  groupName: string,
  needle: string,
  tokens: string[],
): MatchRank | undefined {
  if (name === needle) return MatchRank.ExactName;
  if (name.startsWith(needle)) return MatchRank.NamePrefix;
  if (name.includes(` ${needle}`) || name.includes(`-${needle}`)) {
    return MatchRank.WordPrefix;
  }
  if (tokens.every((token) => name.includes(token))) {
    return MatchRank.NameContains;
  }
  // "interceptor" finds every interceptor; "caldari frig" finds the hulls
  // whose name or group carries each word.
  const haystack = `${name} ${groupName}`;
  if (tokens.every((token) => haystack.includes(token))) {
    return MatchRank.GroupMatch;
  }
  return undefined;
}

/**
 * Search the catalog by item name, group name or type id. Name matches rank
 * ahead of group matches, then shorter names ahead of longer ones — so "rifter"
 * lists the Rifter before the Republic Fleet Rifter's variants.
 */
export function searchCatalogTypes(
  catalog: Pick<IndexedCompareCatalog, "typesById" | "groups">,
  query: string,
  { limit = 50, exclude }: { limit?: number; exclude?: Iterable<number> } = {},
): CatalogType[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < MIN_SEARCH_LENGTH) return [];
  const excluded = new Set(exclude);

  if (/^\d+$/.test(needle)) {
    const type = catalog.typesById.get(Number(needle));
    if (type && !excluded.has(type.typeId)) return [type];
  }

  const tokens = needle.split(/\s+/);
  const matches: { type: CatalogType; rank: MatchRank; name: string }[] = [];
  for (const type of catalog.typesById.values()) {
    if (excluded.has(type.typeId)) continue;
    const name = type.name.toLowerCase();
    const groupName = catalog.groups[type.groupId]?.name.toLowerCase() ?? "";
    const rank = rankMatch(name, groupName, needle, tokens);
    if (rank !== undefined) matches.push({ type, rank, name });
  }

  return matches
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.name.length - b.name.length ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit)
    .map(({ type }) => type);
}

/**
 * Other items from the group of `typeId`, for one-click "compare with" chips:
 * the ones not already compared, in name order.
 */
export function suggestSameGroupTypes(
  catalog: Pick<IndexedCompareCatalog, "typesById" | "typeIdsByGroup">,
  typeId: number,
  { limit = 8, exclude }: { limit?: number; exclude?: Iterable<number> } = {},
): CatalogType[] {
  const type = catalog.typesById.get(typeId);
  if (!type) return [];
  const excluded = new Set(exclude);
  excluded.add(typeId);
  return (catalog.typeIdsByGroup.get(type.groupId) ?? [])
    .filter((id) => !excluded.has(id))
    .slice(0, limit)
    .flatMap((id) => {
      const suggestion = catalog.typesById.get(id);
      return suggestion ? [suggestion] : [];
    });
}
