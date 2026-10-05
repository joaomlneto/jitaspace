import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HttpStatusCode } from "axios";

import type { PageProps } from "./page.client";
import type { TypeDogmaMeta } from "./types";
import type { ItemVariation } from "~/components/Compare/ItemVariations";
import type { NamedTypeListMatch } from "~/lib/typeLists";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { cacheSdeRead } from "~/lib/sdeCache";
import { buildTypeListRuleIndex, matchTypeLists } from "~/lib/typeLists";
import TypePage from "./page.client";
import { emptyTypeDogmaMeta } from "./types";

type TypeData = PageProps & {
  /** 512px artwork for the OpenGraph card — a ship render where one exists. */
  cardImageUrl?: string;
  groupName?: string;
  categoryName?: string;
  /** The base item of this item's variations — itself when it is the base. */
  variationBaseTypeId: number;
  groupId?: number;
  categoryId?: number;
};

async function getTypeData(typeId: number): Promise<TypeData> {
  "use cache";
  cacheSdeRead();

  const type = await prisma.type.findUniqueOrThrow({
    select: {
      typeId: true,
      name: true,
      description: true,
      variationParentTypeId: true,
      groupId: true,
      group: {
        select: {
          name: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      },
    },
    where: {
      typeId,
    },
  });

  const typeImageVariations = (await fetch(
    `https://images.evetech.net/types/${typeId}`,
  ).then((res) => {
    return res.status === Number(HttpStatusCode.NotFound) ? [] : res.json();
  })) as string[];

  const variation: string | undefined = typeImageVariations.includes("icon")
    ? "icon"
    : typeImageVariations[0];

  // The page UI wants the small icon, but a 64px icon unfurls as a postage
  // stamp — the card gets the 512px `render` (a 3/4 view of the hull) when the
  // type publishes one.
  const cardVariation = typeImageVariations.includes("render")
    ? "render"
    : variation;

  return {
    typeId,
    // No variation means the image service has no image for this type at all —
    // `/types/<id>` 404s, and so would any variation we guessed at. Leave the
    // URL undefined so the `openGraph`/`twitter` blocks below drop the tag
    // entirely; interpolating the missing variation shipped
    // `.../types/2/undefined` as og:image on every such page.
    ogImageUrl: variation
      ? `https://images.evetech.net/types/${typeId}/${variation}`
      : undefined,
    cardImageUrl: cardVariation
      ? `https://images.evetech.net/types/${typeId}/${cardVariation}?size=512`
      : undefined,
    typeName: type.name,
    typeDescription: type.description,
    groupName: type.group.name,
    categoryName: type.group.category.name,
    variationBaseTypeId: type.variationParentTypeId ?? typeId,
    groupId: type.groupId,
    categoryId: type.group.categoryId,
  };
}

/** Trimmed text, or undefined when absent or blank. */
function nonEmpty(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}

/**
 * Resolve the SDE presentation metadata for a type's dogma attributes in one
 * query: the attribute rows of this type, each with its unit and category. The
 * client page previously discovered these in three cascading round trips.
 *
 * Attributes ESI reports but we have no row for simply stay absent from the map,
 * which is the same thing the old per-attribute 404 produced.
 *
 * A failure throws rather than degrading here: the caller catches it, so a
 * database blip is never what gets written into the cache entry.
 */
async function readTypeDogmaMeta(typeId: number): Promise<TypeDogmaMeta> {
  "use cache";
  cacheSdeRead();

  const rows = await prisma.typeAttribute.findMany({
    select: {
      attributeId: true,
      attribute: {
        select: {
          displayName: true,
          name: true,
          iconId: true,
          unitId: true,
          attributeCategoryId: true,
          DogmaUnit: { select: { displayName: true, name: true } },
          attributeCategory: { select: { name: true } },
        },
      },
    },
    where: { typeId },
  });

  const attributes: TypeDogmaMeta["attributes"] = {};
  const unitSymbols: TypeDogmaMeta["unitSymbols"] = {};
  const categoryNames: TypeDogmaMeta["categoryNames"] = {};

  for (const { attributeId, attribute } of rows) {
    attributes[attributeId] = {
      displayName: nonEmpty(attribute.displayName),
      name: attribute.name ?? undefined,
      iconId: attribute.iconId ?? undefined,
      unitId: attribute.unitId ?? undefined,
      categoryId: attribute.attributeCategoryId ?? undefined,
    };

    if (attribute.unitId != null) {
      const symbol =
        nonEmpty(attribute.DogmaUnit?.displayName) ??
        nonEmpty(attribute.DogmaUnit?.name);
      if (symbol) unitSymbols[attribute.unitId] = symbol;
    }

    if (attribute.attributeCategoryId != null && attribute.attributeCategory) {
      categoryNames[attribute.attributeCategoryId] =
        attribute.attributeCategory.name;
    }
  }

  return { attributes, unitSymbols, categoryNames };
}

/**
 * The page renders fine without this half, so a database failure degrades to
 * empty metadata instead of erroring the route.
 */
async function getTypeDogmaMeta(typeId: number): Promise<TypeDogmaMeta> {
  try {
    return await readTypeDogmaMeta(typeId);
  } catch {
    return emptyTypeDogmaMeta;
  }
}

/**
 * Every variation of a base item — the base itself and each Tech II, faction,
 * storyline, deadspace and officer version whose `variationParentTypeId`
 * points at it — ordered by meta level, then name. Keyed by the base, so every
 * item of a family shares one cache entry; the lookup uses the
 * `variationParentTypeId` index.
 *
 * A failure throws rather than degrading here: the caller catches it, so a
 * database blip is never what gets written into the cache entry.
 */
async function readTypeVariations(
  baseTypeId: number,
): Promise<ItemVariation[]> {
  "use cache";
  cacheSdeRead();

  const types = await prisma.type.findMany({
    select: {
      typeId: true,
      name: true,
      metaGroupId: true,
      metaLevel: true,
      group: { select: { categoryId: true } },
    },
    where: {
      isDeleted: false,
      published: true,
      OR: [{ typeId: baseTypeId }, { variationParentTypeId: baseTypeId }],
    },
  });
  // A lone item has no variations; skip the meta group lookup.
  if (types.length < 2) return [];

  const metaGroupIds = [
    ...new Set(types.flatMap((type) => type.metaGroupId ?? [])),
  ];
  const metaGroups = await prisma.metaGroup.findMany({
    select: { metaGroupId: true, name: true },
    where: { metaGroupId: { in: metaGroupIds } },
  });
  const metaGroupNames = new Map(
    metaGroups.map((metaGroup) => [metaGroup.metaGroupId, metaGroup.name]),
  );

  return types
    .map((type) => ({
      typeId: type.typeId,
      name: type.name,
      categoryId: type.group.categoryId,
      metaGroupName:
        type.metaGroupId === null
          ? undefined
          : metaGroupNames.get(type.metaGroupId),
      metaLevel: type.metaLevel ?? undefined,
    }))
    .sort(
      (a, b) =>
        (a.metaLevel ?? 0) - (b.metaLevel ?? 0) || a.name.localeCompare(b.name),
    );
}

/**
 * The page renders fine without its Variations tab, so a database failure
 * hides the tab instead of erroring the route.
 */
async function getTypeVariations(baseTypeId: number): Promise<ItemVariation[]> {
  try {
    return await readTypeVariations(baseTypeId);
  } catch {
    return [];
  }
}

/**
 * The type lists whose rules match this type: those it belongs to, plus those
 * that include it only to exclude it again. A type list names categories,
 * groups and types, so the lookup is one query for the rules pointing at any
 * of the three.
 *
 * A failure throws rather than degrading here: the caller catches it, so a
 * database blip is never what gets written into the cache entry.
 */
async function readTypeTypeLists(
  typeId: number,
  groupId: number,
  categoryId: number,
): Promise<NamedTypeListMatch[]> {
  "use cache";
  cacheSdeRead();

  const rules = await prisma.typeListEntry.findMany({
    select: {
      typeListId: true,
      included: true,
      refType: true,
      refId: true,
      typeList: { select: { name: true, displayName: true, isDeleted: true } },
    },
    where: {
      isDeleted: false,
      OR: [
        { refType: "type", refId: typeId },
        { refType: "group", refId: groupId },
        { refType: "category", refId: categoryId },
      ],
    },
  });
  const typeLists = new Map(
    rules.map((rule) => [rule.typeListId, rule.typeList]),
  );

  return matchTypeLists(buildTypeListRuleIndex(rules), {
    typeId,
    groupId,
    categoryId,
  }).flatMap((match) => {
    const typeList = typeLists.get(match.typeListId);
    // A list that only excludes this type never included it: not worth a row.
    if (!typeList || typeList.isDeleted || match.includedBy.length === 0) {
      return [];
    }
    return [
      { ...match, name: typeList.name, displayName: typeList.displayName },
    ];
  });
}

/**
 * The page renders fine without its Type Lists tab, so a database failure
 * hides the tab instead of erroring the route.
 */
async function getTypeTypeLists(
  typeId: number,
  groupId: number | undefined,
  categoryId: number | undefined,
): Promise<NamedTypeListMatch[]> {
  if (groupId === undefined || categoryId === undefined) return [];
  try {
    return await readTypeTypeLists(typeId, groupId, categoryId);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ typeId: string }>;
}): Promise<Metadata> {
  const { typeId: typeIdParam } = await params;
  const typeId = parsePositiveEntityId(typeIdParam);
  if (typeId === null) return {};

  try {
    const { typeName, typeDescription, cardImageUrl, groupName, categoryName } =
      await getTypeData(typeId);
    if (!typeName) return {};

    return pageMetadata({
      title: typeName,
      description: toDescription(
        typeDescription,
        `${typeName} in EVE Online — attributes, market prices, and where to buy it.`,
      ),
      path: `/type/${typeId}`,
      badge: categoryName ?? "Item",
      image: cardImageUrl,
      facts: [
        ...(groupName ? [{ label: "Group", value: groupName }] : []),
        ...(categoryName ? [{ label: "Category", value: categoryName }] : []),
      ],
    });
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ typeId: string }>;
}>) {
  const { typeId: typeIdParam } = await params;
  const typeId = parsePositiveEntityId(typeIdParam);
  if (typeId === null) {
    notFound();
  }

  let data: TypeData;
  try {
    data = await getTypeData(typeId);
  } catch {
    notFound();
  }
  // Only the client component's own props cross the boundary; the extra fields
  // `getTypeData` returns exist for the OpenGraph card and stay on the server.
  const props: PageProps = {
    typeId: data.typeId,
    ogImageUrl: data.ogImageUrl,
    typeName: data.typeName,
    typeDescription: data.typeDescription,
  };
  const [dogmaMeta, variations, typeLists] = await Promise.all([
    getTypeDogmaMeta(typeId),
    getTypeVariations(data.variationBaseTypeId),
    getTypeTypeLists(typeId, data.groupId, data.categoryId),
  ]);
  return (
    <TypePage
      {...props}
      dogmaMeta={dogmaMeta}
      variations={variations}
      typeLists={typeLists}
    />
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ typeId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
