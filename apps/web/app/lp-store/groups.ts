export interface LPStoreCorporation {
  corporationId: number;
  name: string;
}

/**
 * Corporations sharing a faction. A `null` faction holds the corporations
 * that have no faction.
 */
export interface LPStoreGroup {
  faction: { factionId: number; name: string } | null;
  corporations: LPStoreCorporation[];
}

/**
 * Group corporations by faction: factions alphabetically, each one's
 * corporations alphabetically, and corporations with no faction in a trailing
 * group.
 */
export function groupCorporationsByFaction(
  corporations: readonly (LPStoreCorporation & {
    faction: NonNullable<LPStoreGroup["faction"]> | null;
  })[],
): LPStoreGroup[] {
  const groups = new Map<number | null, LPStoreGroup>();
  for (const { corporationId, name, faction } of corporations) {
    const key = faction?.factionId ?? null;
    let group = groups.get(key);
    if (!group) {
      group = { faction, corporations: [] };
      groups.set(key, group);
    }
    group.corporations.push({ corporationId, name });
  }
  for (const group of groups.values()) {
    group.corporations.sort((a, b) => a.name.localeCompare(b.name));
  }
  return [...groups.values()].sort((a, b) => {
    if (a.faction === null) return 1;
    if (b.faction === null) return -1;
    return a.faction.name.localeCompare(b.faction.name);
  });
}

/**
 * Keep the groups that match `query`, case-insensitively: a group whose faction
 * name matches keeps all its corporations, any other keeps only the
 * corporations whose name matches, and a group left empty is dropped.
 *
 * With `onlyCorporationIds`, corporations outside that set are dropped first,
 * so a faction match keeps only the faction's corporations in the set.
 */
export function filterLPStoreGroups(
  groups: readonly LPStoreGroup[],
  query: string,
  { onlyCorporationIds }: { onlyCorporationIds?: ReadonlySet<number> } = {},
): readonly LPStoreGroup[] {
  // `toLowerCase`, not `toLocaleLowerCase`: in a Turkish locale the latter
  // lowercases "I" to a dotless "ı", so "imperial" would not match
  // "Imperial Navy".
  const needle = query.trim().toLowerCase();
  if (needle === "" && !onlyCorporationIds) return groups;
  const matches = (name: string) => name.toLowerCase().includes(needle);
  return groups.flatMap((group) => {
    const eligible = onlyCorporationIds
      ? group.corporations.filter(({ corporationId }) =>
          onlyCorporationIds.has(corporationId),
        )
      : group.corporations;
    const corporations =
      needle === "" || (group.faction && matches(group.faction.name))
        ? eligible
        : eligible.filter(({ name }) => matches(name));
    if (corporations.length === 0) return [];
    return corporations === group.corporations
      ? [group]
      : [{ ...group, corporations }];
  });
}
