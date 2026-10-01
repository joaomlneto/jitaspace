import type {
  CatalogAttribute,
  CatalogGroup,
  CatalogTypeRow,
  CompareCatalog,
} from "~/components/Compare/catalog";
import { COMPARABLE_CATEGORY_IDS } from "~/components/Compare/catalog";
import { prisma } from "~/lib/db";
import { cacheSdeRead } from "~/lib/sdeCache";

/** Trimmed text, or undefined when absent or blank. */
function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}

/**
 * Read the compare tool's catalog: the searchable types and the presentation
 * metadata for every dogma attribute. See `~/components/Compare/catalog`.
 *
 * Only SDE tables, so it is cached until the next ingest. It carries no
 * argument, so the build resolves it once and the route that serves it is
 * prerendered: visitors are served a static file and never reach the
 * database. A failure throws — that fails the build, or at request time gives
 * a transient error — rather than caching an empty catalog.
 *
 * The document is ~700 KB of JSON (~115 KB gzipped), inside the 2 MB limit on
 * a `"use cache"` entry; widening `COMPARABLE_CATEGORY_IDS` to blueprints or
 * SKINs would change that.
 */
export async function readCompareCatalog(): Promise<CompareCatalog> {
  "use cache";
  cacheSdeRead();

  const categoryIds = [...COMPARABLE_CATEGORY_IDS];
  const [types, groups, attributes, units, categories, metaGroups] =
    await Promise.all([
      prisma.type.findMany({
        select: { typeId: true, name: true, groupId: true, metaGroupId: true },
        where: {
          isDeleted: false,
          published: true,
          group: { categoryId: { in: categoryIds } },
        },
      }),
      prisma.group.findMany({
        select: { groupId: true, name: true, categoryId: true },
        where: { isDeleted: false, categoryId: { in: categoryIds } },
      }),
      prisma.dogmaAttribute.findMany({
        select: {
          attributeId: true,
          name: true,
          displayName: true,
          attributeCategoryId: true,
          unitId: true,
          iconId: true,
          defaultValue: true,
          highIsGood: true,
          published: true,
        },
        where: { isDeleted: false },
      }),
      prisma.dogmaUnit.findMany({
        select: { unitId: true, displayName: true },
        where: { isDeleted: false },
      }),
      prisma.dogmaAttributeCategory.findMany({
        select: { attributeCategoryId: true, name: true },
        where: { isDeleted: false },
      }),
      prisma.metaGroup.findMany({
        select: { metaGroupId: true, name: true },
        where: { isDeleted: false },
      }),
    ]);

  const typeRows: CatalogTypeRow[] = types.map((type) => [
    type.typeId,
    type.name,
    type.groupId,
    type.metaGroupId ?? 0,
  ]);

  // Only the groups a searchable type belongs to.
  const usedGroupIds = new Set(types.map((type) => type.groupId));
  const groupsById: Record<number, CatalogGroup> = {};
  for (const group of groups) {
    if (!usedGroupIds.has(group.groupId)) continue;
    groupsById[group.groupId] = {
      name: group.name,
      categoryId: group.categoryId,
    };
  }

  // Absent fields are left off rather than written as null: JSON drops
  // undefined, and there are ~2,900 attributes.
  const attributesById: Record<number, CatalogAttribute> = {};
  for (const attribute of attributes) {
    attributesById[attribute.attributeId] = {
      name: attribute.name ?? `attribute ${attribute.attributeId}`,
      displayName: nonEmpty(attribute.displayName),
      categoryId: attribute.attributeCategoryId ?? undefined,
      unitId: attribute.unitId ?? undefined,
      iconId: attribute.iconId ?? undefined,
      defaultValue: attribute.defaultValue ?? undefined,
      highIsGood: attribute.highIsGood ?? undefined,
      published: attribute.published === true ? true : undefined,
    };
  }

  // Only the display name, as the client prints it: a unit without one (e.g.
  // "Fitting slots") is shown as a bare number, not "4 Fitting slots".
  const unitSymbols: Record<number, string> = {};
  for (const unit of units) {
    const symbol = nonEmpty(unit.displayName);
    if (symbol) unitSymbols[unit.unitId] = symbol;
  }

  const attributeCategories: Record<number, string> = {};
  for (const category of categories) {
    attributeCategories[category.attributeCategoryId] = category.name;
  }

  const metaGroupNames: Record<number, string> = {};
  for (const metaGroup of metaGroups) {
    metaGroupNames[metaGroup.metaGroupId] = metaGroup.name;
  }

  return {
    types: typeRows,
    groups: groupsById,
    attributes: attributesById,
    unitSymbols,
    attributeCategories,
    metaGroups: metaGroupNames,
  };
}
