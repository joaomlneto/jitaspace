import type { TypeListRefType, TypeListRule } from "~/lib/typeLists";
import { prisma } from "~/lib/db";
import { cacheSdeRead } from "~/lib/sdeCache";

export interface TypeListRuleDetail extends Omit<TypeListRule, "typeListId"> {
  /** Name of the type, group or category the rule points at, if it exists. */
  name: string | null;
}

/**
 * A member as a tuple rather than an object: the field names would otherwise
 * repeat on every row, and the largest list has ~16k rows (see `members`).
 */
export type TypeListMember = [
  typeId: number,
  name: string,
  groupId: number,
  published: boolean,
];

export interface TypeListAssemblyLineUse {
  industryAssemblyLineId: number;
  name: string;
  activityName: string | null;
  materialMultiplier: number;
  timeMultiplier: number;
  costMultiplier: number | null;
}

export interface TypeListDetail {
  typeListId: number;
  name: string;
  displayName: string | null;
  displayDescription: string | null;
  rules: TypeListRuleDetail[];
  /**
   * Every type the rules resolve to. Kept narrow — tuples, with group and
   * category names living once in `groups`/`categories` — because the largest
   * list holds ~16k types and this whole value is one `"use cache"` entry,
   * which Next silently stops storing past 2 MB.
   */
  members: TypeListMember[];
  /** Every group a member or a rule references, keyed by group id. */
  groups: Record<number, { name: string; categoryId: number }>;
  /** Every category a member or a rule references, keyed by category id. */
  categories: Record<number, string>;
  assemblyLines: TypeListAssemblyLineUse[];
}

const refIds = (
  rules: readonly Omit<TypeListRule, "typeListId">[],
  included: boolean,
  refType: TypeListRefType,
) =>
  rules
    .filter((rule) => rule.included === included && rule.refType === refType)
    .map((rule) => rule.refId);

/**
 * Everything about one type list, or `null` when there is no such list.
 *
 * Throws on a database failure rather than returning `null`: a `null` here is
 * a cached 404 (see CLAUDE.md → "Never catch a database error inside a
 * `"use cache"` scope").
 */
export async function getTypeList(
  typeListId: number,
): Promise<TypeListDetail | null> {
  "use cache";
  cacheSdeRead();

  const typeList = await prisma.typeList.findUnique({
    select: {
      typeListId: true,
      name: true,
      displayName: true,
      displayDescription: true,
      isDeleted: true,
      entries: {
        select: { included: true, refType: true, refId: true },
        where: { isDeleted: false },
      },
    },
    where: { typeListId },
  });
  if (typeList === null || typeList.isDeleted) return null;

  const rules = typeList.entries;
  const includedTypeIds = refIds(rules, true, "type");
  const includedGroupIds = refIds(rules, true, "group");
  const includedCategoryIds = refIds(rules, true, "category");
  const excludedTypeIds = refIds(rules, false, "type");
  const excludedGroupIds = refIds(rules, false, "group");
  const excludedCategoryIds = refIds(rules, false, "category");

  const [memberRows, ruleTypes, assemblyLineUses] = await Promise.all([
    // A list with no include rules has no members — skip the query rather
    // than send an `OR` of three empty `in`s.
    includedTypeIds.length +
    includedGroupIds.length +
    includedCategoryIds.length
      ? prisma.type.findMany({
          select: { typeId: true, name: true, groupId: true, published: true },
          where: {
            isDeleted: false,
            OR: [
              { typeId: { in: includedTypeIds } },
              { groupId: { in: includedGroupIds } },
              { group: { categoryId: { in: includedCategoryIds } } },
            ],
            NOT: [
              { typeId: { in: excludedTypeIds } },
              { groupId: { in: excludedGroupIds } },
              { group: { categoryId: { in: excludedCategoryIds } } },
            ],
          },
          orderBy: { typeId: "asc" },
        })
      : Promise.resolve([]),
    prisma.type.findMany({
      select: { typeId: true, name: true },
      where: { typeId: { in: [...includedTypeIds, ...excludedTypeIds] } },
    }),
    prisma.industryAssemblyLineTypeList.findMany({
      select: {
        materialMultiplier: true,
        timeMultiplier: true,
        costMultiplier: true,
        assemblyLine: {
          select: {
            industryAssemblyLineId: true,
            name: true,
            industryActivityId: true,
          },
        },
      },
      where: { typeListId, isDeleted: false },
    }),
  ]);

  const groupIds = new Set([
    ...includedGroupIds,
    ...excludedGroupIds,
    ...memberRows.map((member) => member.groupId),
  ]);
  const groupRows = await prisma.group.findMany({
    select: { groupId: true, name: true, categoryId: true },
    where: { groupId: { in: [...groupIds] } },
  });

  const categoryIds = new Set([
    ...includedCategoryIds,
    ...excludedCategoryIds,
    ...groupRows.map((group) => group.categoryId),
  ]);
  const activityIds = [
    ...new Set(
      assemblyLineUses.map((use) => use.assemblyLine.industryActivityId),
    ),
  ];
  const [categoryRows, activityRows] = await Promise.all([
    prisma.category.findMany({
      select: { categoryId: true, name: true },
      where: { categoryId: { in: [...categoryIds] } },
    }),
    activityIds.length
      ? prisma.industryActivity.findMany({
          select: { industryActivityId: true, name: true },
          where: { industryActivityId: { in: activityIds } },
        })
      : Promise.resolve([]),
  ]);

  const groups: TypeListDetail["groups"] = {};
  for (const group of groupRows) {
    groups[group.groupId] = { name: group.name, categoryId: group.categoryId };
  }
  const categories: TypeListDetail["categories"] = {};
  for (const category of categoryRows) {
    categories[category.categoryId] = category.name;
  }
  const typeNames = new Map(ruleTypes.map((type) => [type.typeId, type.name]));
  const activityNames = new Map(
    activityRows.map((activity) => [
      activity.industryActivityId,
      activity.name,
    ]),
  );

  const ruleName = (refType: TypeListRefType, refId: number) => {
    switch (refType) {
      case "type":
        return typeNames.get(refId) ?? null;
      case "group":
        return groups[refId]?.name ?? null;
      case "category":
        return categories[refId] ?? null;
    }
  };

  return {
    typeListId: typeList.typeListId,
    name: typeList.name,
    displayName: typeList.displayName,
    displayDescription: typeList.displayDescription,
    rules: rules
      .map((rule) => ({ ...rule, name: ruleName(rule.refType, rule.refId) }))
      // Rules whose referent no longer exists (no name) go last.
      .sort((a, b) =>
        a.name === null || b.name === null
          ? Number(a.name === null) - Number(b.name === null)
          : a.name.localeCompare(b.name),
      ),
    members: memberRows.map(
      (member): TypeListMember => [
        member.typeId,
        member.name,
        member.groupId,
        member.published,
      ],
    ),
    groups,
    categories,
    assemblyLines: assemblyLineUses
      .map((use) => ({
        industryAssemblyLineId: use.assemblyLine.industryAssemblyLineId,
        name: use.assemblyLine.name,
        activityName:
          activityNames.get(use.assemblyLine.industryActivityId) ?? null,
        materialMultiplier: use.materialMultiplier,
        timeMultiplier: use.timeMultiplier,
        costMultiplier: use.costMultiplier,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
