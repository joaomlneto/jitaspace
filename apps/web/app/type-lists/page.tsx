import type { TypeListRow } from "./page.client";
import { prisma } from "~/lib/db";
import { pageMetadata } from "~/lib/metadata";
import { cacheSdeRead } from "~/lib/sdeCache";
import { countTypeListMembers } from "~/lib/typeLists";
import TypeListsPage from "./page.client";

export const metadata = pageMetadata({
  title: "Type Lists",
  description:
    "Browse the named item lists EVE Online uses for game rules — which ships, modules and items each one includes and excludes.",
  path: "/type-lists",
  badge: "Items",
});

export default async function Page() {
  "use cache";
  cacheSdeRead();
  // Deliberately uncaught. A catch here — inside the `"use cache"` scope —
  // would make `notFound()` a *successful* render that Next stores and serves
  // for the whole `cacheLife` window. Throwing writes nothing to the cache, so
  // the route recovers as soon as the database does. See CLAUDE.md → "Never
  // catch a database error inside a `"use cache"` scope".
  const [typeLists, rules, typesPerGroup, groups] = await Promise.all([
    prisma.typeList.findMany({
      select: {
        typeListId: true,
        name: true,
        displayName: true,
        displayDescription: true,
      },
      where: { isDeleted: false },
    }),
    prisma.typeListEntry.findMany({
      select: {
        typeListId: true,
        included: true,
        refType: true,
        refId: true,
      },
      where: { isDeleted: false },
    }),
    // Member counts need each type's place in the inventory tree. Only types
    // a type rule names need a row of their own; every other type matches by
    // group or category alone, so a per-group count stands in for them.
    prisma.type.groupBy({
      by: ["groupId"],
      _count: { _all: true },
      where: { isDeleted: false },
    }),
    // Every group, deleted or not: the detail page's member query does not
    // filter on the group either, and the two counts must agree.
    prisma.group.findMany({ select: { groupId: true, categoryId: true } }),
  ]);
  const namedTypes = await prisma.type.findMany({
    select: { typeId: true, groupId: true },
    where: {
      isDeleted: false,
      typeId: {
        in: [
          ...new Set(
            rules
              .filter((rule) => rule.refType === "type")
              .map((rule) => rule.refId),
          ),
        ],
      },
    },
  });

  const categoryOfGroup = new Map(
    groups.map((group) => [group.groupId, group.categoryId]),
  );
  const namedPerGroup = new Map<number, number>();
  for (const type of namedTypes) {
    namedPerGroup.set(type.groupId, (namedPerGroup.get(type.groupId) ?? 0) + 1);
  }
  const memberCounts = countTypeListMembers(rules, [
    ...namedTypes.flatMap((type) => {
      const categoryId = categoryOfGroup.get(type.groupId);
      return categoryId === undefined
        ? []
        : [{ typeId: type.typeId, groupId: type.groupId, categoryId }];
    }),
    ...typesPerGroup.flatMap(({ groupId, _count }) => {
      const categoryId = categoryOfGroup.get(groupId);
      const count = _count._all - (namedPerGroup.get(groupId) ?? 0);
      return categoryId === undefined || count <= 0
        ? []
        : [{ typeId: -1, groupId, categoryId, count }];
    }),
  ]);

  const rows = new Map<number, TypeListRow>(
    typeLists.map((typeList) => [
      typeList.typeListId,
      {
        typeListId: typeList.typeListId,
        name: typeList.name,
        displayName: typeList.displayName,
        displayDescription: typeList.displayDescription,
        included: { category: 0, group: 0, type: 0 },
        excluded: { category: 0, group: 0, type: 0 },
        memberCount: memberCounts.get(typeList.typeListId) ?? 0,
      },
    ]),
  );
  for (const rule of rules) {
    const row = rows.get(rule.typeListId);
    if (row) (rule.included ? row.included : row.excluded)[rule.refType] += 1;
  }

  return (
    <TypeListsPage
      typeLists={[...rows.values()].sort((a, b) => a.typeListId - b.typeListId)}
    />
  );
}
