/**
 * Membership rules for SDE type lists (typeLists.yaml).
 *
 * A type list is a named set of types defined by rules rather than by an
 * enumeration: it includes types, groups and categories, and excludes types,
 * groups and categories. A type belongs to a list when at least one include
 * rule matches it (its own id, its group, or its group's category) and no
 * exclude rule does. Exclusion wins: in the SDE the excludes only ever carve
 * pieces out of a broader include (e.g. "every ship but capsules").
 *
 * Pure and dependency-free, so the server routes and the client tables resolve
 * membership the same way.
 */

export type TypeListRefType = "type" | "group" | "category";

/** The order rule kinds are presented in: broadest first. */
export const TYPE_LIST_REF_TYPES: readonly TypeListRefType[] = [
  "category",
  "group",
  "type",
];

export const TYPE_LIST_REF_TYPE_LABELS: Record<TypeListRefType, string> = {
  category: "Category",
  group: "Group",
  type: "Type",
};

/** One include/exclude rule — a `TypeListEntry` row. */
export interface TypeListRule {
  typeListId: number;
  included: boolean;
  refType: TypeListRefType;
  refId: number;
}

/** Where a type sits in the inventory tree. */
export interface TypeClassification {
  typeId: number;
  groupId: number;
  categoryId: number;
}

/** How one list's rules match one type. */
export interface TypeListMatch {
  typeListId: number;
  /** The kinds of include rule that matched, broadest first. */
  includedBy: TypeListRefType[];
  /** The kinds of exclude rule that matched, broadest first. */
  excludedBy: TypeListRefType[];
}

/** A match together with the list's names, for display. */
export interface NamedTypeListMatch extends TypeListMatch {
  name: string;
  displayName: string | null;
}

/** A type is a member when something includes it and nothing excludes it. */
export function isTypeListMember(match: TypeListMatch): boolean {
  return match.includedBy.length > 0 && match.excludedBy.length === 0;
}

/** Rules keyed by what they point at, so a type is matched in O(1) per kind. */
export type TypeListRuleIndex = ReadonlyMap<string, readonly TypeListRule[]>;

const ruleKey = (refType: TypeListRefType, refId: number) =>
  `${refType}:${refId}`;

export function buildTypeListRuleIndex(
  rules: Iterable<TypeListRule>,
): TypeListRuleIndex {
  const index = new Map<string, TypeListRule[]>();
  for (const rule of rules) {
    const key = ruleKey(rule.refType, rule.refId);
    const bucket = index.get(key);
    if (bucket) bucket.push(rule);
    else index.set(key, [rule]);
  }
  return index;
}

const byRefTypeOrder = (a: TypeListRefType, b: TypeListRefType) =>
  TYPE_LIST_REF_TYPES.indexOf(a) - TYPE_LIST_REF_TYPES.indexOf(b);

/**
 * Every list with at least one rule matching `type`, members and excluded
 * alike, ordered by list id. Filter with `isTypeListMember` for membership.
 */
export function matchTypeLists(
  index: TypeListRuleIndex,
  type: TypeClassification,
): TypeListMatch[] {
  const matches = new Map<number, TypeListMatch>();
  const refs: [TypeListRefType, number][] = [
    ["category", type.categoryId],
    ["group", type.groupId],
    ["type", type.typeId],
  ];
  for (const [refType, refId] of refs) {
    for (const rule of index.get(ruleKey(refType, refId)) ?? []) {
      let match = matches.get(rule.typeListId);
      if (!match) {
        match = { typeListId: rule.typeListId, includedBy: [], excludedBy: [] };
        matches.set(rule.typeListId, match);
      }
      const kinds = rule.included ? match.includedBy : match.excludedBy;
      if (!kinds.includes(refType)) kinds.push(refType);
    }
  }
  return [...matches.values()]
    .map((match) => ({
      ...match,
      includedBy: match.includedBy.toSorted(byRefTypeOrder),
      excludedBy: match.excludedBy.toSorted(byRefTypeOrder),
    }))
    .sort((a, b) => a.typeListId - b.typeListId);
}

/**
 * Number of member types per list id; lists with no members are absent.
 *
 * A classification may stand for `count` types at once (default 1) — e.g. every
 * type of a group that no type rule names, with a `typeId` no rule names (-1).
 */
export function countTypeListMembers(
  rules: Iterable<TypeListRule>,
  types: Iterable<TypeClassification & { count?: number }>,
): Map<number, number> {
  const index = buildTypeListRuleIndex(rules);
  const counts = new Map<number, number>();
  for (const type of types) {
    for (const match of matchTypeLists(index, type)) {
      if (isTypeListMember(match)) {
        counts.set(
          match.typeListId,
          (counts.get(match.typeListId) ?? 0) + (type.count ?? 1),
        );
      }
    }
  }
  return counts;
}
