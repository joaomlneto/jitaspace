import type { MarketTree } from "./readMarketTree";

/** What the market sidebar shows for a search query. */
export interface MarketTreeFilter {
  /** Groups to render: a match, an ancestor of one, or inside a matched group. */
  visibleGroupIds: Set<number>;
  /** Types to render when their group is open. */
  visibleTypeIds: Set<number>;
  /** Groups with a match somewhere beneath them — opened so it is in view. */
  expandedGroupIds: Set<number>;
  /** Groups and types whose own name matches. */
  matchCount: number;
}

/**
 * Filter the market tree to the groups and types matching `query`
 * (case-insensitive substring of the name), or `null` for an empty query.
 *
 * A matching group keeps its whole subtree visible, so searching "Frigates"
 * still lets you browse every frigate; a matching type keeps the path of groups
 * above it. Only groups on the way to a match are listed for expanding, so a
 * matched group with thousands of types does not open them all at once.
 */
export function filterMarketTree(
  tree: MarketTree,
  query: string,
): MarketTreeFilter | null {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") return null;

  const filter: MarketTreeFilter = {
    visibleGroupIds: new Set(),
    visibleTypeIds: new Set(),
    expandedGroupIds: new Set(),
    matchCount: 0,
  };
  const matches = (name: string) => name.toLocaleLowerCase().includes(needle);

  /** Returns whether the group or anything beneath it matched by name. */
  const visit = (marketGroupId: number, insideMatch: boolean): boolean => {
    const group = tree.marketGroups[marketGroupId];
    if (!group) return false;

    const selfMatch = matches(group.name);
    if (selfMatch) filter.matchCount++;
    const showAll = insideMatch || selfMatch;
    let matchBelow = false;

    for (const childId of group.childrenMarketGroupIds) {
      if (visit(childId, showAll)) matchBelow = true;
    }
    for (const type of group.types) {
      const typeMatch = matches(type.name);
      if (typeMatch) {
        filter.matchCount++;
        matchBelow = true;
      }
      if (showAll || typeMatch) filter.visibleTypeIds.add(type.typeId);
    }

    if (showAll || matchBelow) filter.visibleGroupIds.add(marketGroupId);
    if (matchBelow) filter.expandedGroupIds.add(marketGroupId);
    return selfMatch || matchBelow;
  };

  for (const rootId of tree.rootMarketGroupIds) visit(rootId, false);
  return filter;
}
