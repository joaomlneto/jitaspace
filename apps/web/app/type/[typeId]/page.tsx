import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/react";

import type { PageProps } from "./page.client";
import type { TypeDogmaMeta } from "./types";
import type { ItemVariation } from "~/components/Compare/ItemVariations";
import type { InsurancePricePeriod } from "~/lib/insurance";
import type { NpcStats } from "~/lib/npcStats";
import type { TypeSynchronizer } from "~/lib/synchronizer";
import type { NamedTypeListMatch } from "~/lib/typeLists";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { resolveEffectDescription } from "~/lib/dogmaEffectDescription";
import { readLatestTypeInsurance } from "~/lib/insuranceData";
import {
  pageMetadata,
  readTypeImageVariations,
  toDescription,
} from "~/lib/metadata";
import { hasCombatStats } from "~/lib/npcStats";
import {
  COMBAT_STATS_CATEGORY_IDS,
  DRONE_CATEGORY_ID,
  readNpcStats,
} from "~/lib/npcStatsData";
import { readEffectCategories } from "~/lib/readEffectCategories";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { cacheSdeRead, SDE_CACHE_TAG } from "~/lib/sdeCache";
import {
  emptyTypeSynchronizer,
  SYNCHRONIZER_CATEGORY_ID,
} from "~/lib/synchronizer";
import { readTypeSynchronizer } from "~/lib/synchronizerData";
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

/**
 * The item's own row, or null for an id the SDE does not have. `findUnique`,
 * not `findUniqueOrThrow`: this page is cached whole, so a missing row (a 404,
 * legitimately stored) must stay distinguishable from a failed query, which
 * throws out of this scope and is never stored.
 */
async function readType(typeId: number) {
  "use cache";
  cacheSdeRead();

  return prisma.type.findUnique({
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
}

/**
 * Keeps a render that went without one of its parts out of the page's ISR
 * cache. The page is cached whole, so without this a database or CDN blip
 * during a revalidation would be served as the item's page, missing that part,
 * until the next one. `connection()` makes this render request-time instead,
 * and the next request retries.
 */
async function renderUncached(): Promise<void> {
  // Imported here, on the failure path only: `next/server` cannot load in the
  // jsdom suites that import this page.
  const { connection } = await import("next/server");
  await connection();
}

/**
 * Which images the image service has for this item. An item without any is
 * still a page; a failed lookup leaves the image out of this render only.
 */
async function getTypeImageVariations(typeId: number): Promise<string[]> {
  try {
    return await readTypeImageVariations(typeId);
  } catch {
    await renderUncached();
    return [];
  }
}

/** The item's page data, or null for an item that does not exist. */
async function getTypeData(typeId: number): Promise<TypeData | null> {
  const [type, typeImageVariations] = await Promise.all([
    readType(typeId),
    getTypeImageVariations(typeId),
  ]);
  if (!type) return null;

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
 * which is the same thing the old per-attribute 404 produced. A second query
 * names the type's effects and picks each one's description: CCP's, else our
 * AI-generated one. A third reads the effect categories, so the page can group
 * the effects by when they apply.
 *
 * A failure throws rather than degrading here: the caller catches it, so a
 * database blip is never what gets written into the cache entry.
 *
 * Not `cacheSdeRead()`: effects' `customDescription` and the categories'
 * names are written by our own scripts, not by the SDE ingest, so the entry
 * keeps a daily `cacheLife` and only adds the SDE tag, as
 * `app/lp-store/page.tsx` does.
 */
async function readTypeDogmaMeta(typeId: number): Promise<TypeDogmaMeta> {
  "use cache";
  cacheLife("days");
  cacheTag(SDE_CACHE_TAG);

  const [rows, effectRows, effectCategories] = await Promise.all([
    prisma.typeAttribute.findMany({
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
    }),
    prisma.typeEffect.findMany({
      select: {
        effectId: true,
        effect: {
          select: {
            name: true,
            displayName: true,
            description: true,
            customDescription: true,
            effectCategoryId: true,
          },
        },
      },
      where: { typeId, isDeleted: false },
    }),
    readEffectCategories(),
  ]);

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

  const effects: TypeDogmaMeta["effects"] = {};
  for (const { effectId, effect } of effectRows) {
    const description = resolveEffectDescription(
      effect.description,
      effect.customDescription,
    );
    effects[effectId] = {
      name: nonEmpty(effect.displayName) ?? effect.name ?? undefined,
      description: description ?? undefined,
      categoryId: effect.effectCategoryId ?? undefined,
    };
  }

  return { attributes, unitSymbols, categoryNames, effects, effectCategories };
}

/**
 * The page renders fine without this half, so a database failure degrades to
 * empty metadata instead of erroring the route, in a render kept out of the
 * cache (`renderUncached`).
 */
async function getTypeDogmaMeta(typeId: number): Promise<TypeDogmaMeta> {
  try {
    return await readTypeDogmaMeta(typeId);
  } catch {
    await renderUncached();
    return emptyTypeDogmaMeta;
  }
}

/**
 * An NPC's or drone's combat figures (damage by type, hit points and
 * resistances, speed, electronic warfare, repair, mining), computed from its
 * dogma attributes and effects. Null when it has none worth showing.
 *
 * A failure throws rather than degrading here: the caller catches it, so a
 * database blip is never what gets written into the cache entry.
 */
async function readTypeNpcStats(
  typeId: number,
  categoryId: number,
): Promise<NpcStats | null> {
  "use cache";
  cacheSdeRead();
  const stats = (await readNpcStats([typeId])).get(typeId);
  if (!stats || !hasCombatStats(stats)) return null;
  // A drone that neither shoots nor does anything else is a mutated drone's
  // template, whose real figures come from the mutaplasmid's rolls.
  if (
    categoryId === DRONE_CATEGORY_ID &&
    stats.weapons.length === 0 &&
    stats.ewar.length === 0
  ) {
    return null;
  }
  return stats;
}

/**
 * Combat figures for NPCs and drones only: a player ship's damage comes from
 * its fitted modules, not from its own attributes. The page renders fine
 * without them, so a database failure just leaves the tab out, uncached.
 */
async function getTypeNpcStats(
  typeId: number,
  categoryId: number | undefined,
): Promise<NpcStats | null> {
  if (categoryId === undefined) return null;
  if (!COMBAT_STATS_CATEGORY_IDS.includes(categoryId)) return null;
  try {
    return await readTypeNpcStats(typeId, categoryId);
  } catch {
    await renderUncached();
    return null;
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
 * hides the tab, uncached, instead of erroring the route.
 */
async function getTypeVariations(baseTypeId: number): Promise<ItemVariation[]> {
  try {
    return await readTypeVariations(baseTypeId);
  } catch {
    await renderUncached();
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
 * hides the tab, uncached, instead of erroring the route.
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
    await renderUncached();
    return [];
  }
}

/**
 * The item's place in the Synchronizer rig chain: a rig's scaling bonuses and
 * the modules that feed them, or the rigs a module feeds.
 *
 * A failure throws rather than degrading here: the caller catches it, so a
 * database blip is never what gets written into the cache entry. Not
 * `cacheSdeRead()`: the effect descriptions include our own
 * `customDescription`, which the SDE ingest does not write.
 */
async function readCachedTypeSynchronizer(
  typeId: number,
  groupId: number,
): Promise<TypeSynchronizer> {
  "use cache";
  cacheLife("days");
  cacheTag(SDE_CACHE_TAG);
  return readTypeSynchronizer(typeId, groupId);
}

/**
 * The page renders fine without its Synchronizer tab, so a database failure
 * hides the tab, uncached, instead of erroring the route. Only modules can be in the
 * chain, so ships, skills and the rest skip the read.
 */
async function getTypeSynchronizer(
  typeId: number,
  groupId: number | undefined,
  categoryId: number | undefined,
): Promise<TypeSynchronizer> {
  if (groupId === undefined || categoryId !== SYNCHRONIZER_CATEGORY_ID) {
    return emptyTypeSynchronizer;
  }
  try {
    return await readCachedTypeSynchronizer(typeId, groupId);
  } catch {
    await renderUncached();
    return emptyTypeSynchronizer;
  }
}

/**
 * The ship's latest insurance prices, for its Insurance tab. The page renders
 * fine without them, so a database failure just leaves the tab out, uncached.
 */
async function getTypeInsurance(
  typeId: number,
): Promise<InsurancePricePeriod | null> {
  try {
    return await readLatestTypeInsurance(typeId);
  } catch {
    await renderUncached();
    return null;
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

  // Uncaught, like the page body: this route is cached whole, so a database
  // failure must throw rather than store generic metadata.
  const data = await getTypeData(typeId);
  if (!data?.typeName) return {};
  const { typeName, typeDescription, cardImageUrl, groupName, categoryName } =
    data;

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
}

// ISR per item: without `generateStaticParams` an unlisted id re-renders, and
// re-runs every query below, on every request (see apps/web/CLAUDE.md → "ISR
// for a dynamic `[param]` route"). The real ids live in the database, which
// `next build` cannot reach in CI, and Cache Components rejects an empty list
// — so this lists one id `parsePositiveEntityId` refuses, which prerenders as a
// 404 without a query. The page then revalidates on its shortest read's
// `cacheLife` (the insurance prices', hourly).
export function generateStaticParams() {
  return [{ typeId: "0" }];
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

  // Uncaught: this page is cached whole, so a database failure must throw
  // rather than store a 404. `null` is an item that genuinely does not exist.
  const data = await getTypeData(typeId);
  if (!data) notFound();
  // Only the client component's own props cross the boundary; the extra fields
  // `getTypeData` returns exist for the OpenGraph card and stay on the server.
  const props: PageProps = {
    typeId: data.typeId,
    ogImageUrl: data.ogImageUrl,
    typeName: data.typeName,
    typeDescription: data.typeDescription,
  };
  // No history read here: the History tab fetches it from
  // `/api/history/entity/type/[typeId]` when it opens. Read inside this render, any
  // history database outage failed the page's background revalidation.
  const [dogmaMeta, variations, typeLists, npcStats, insurance, synchronizer] =
    await Promise.all([
      getTypeDogmaMeta(typeId),
      getTypeVariations(data.variationBaseTypeId),
      getTypeTypeLists(typeId, data.groupId, data.categoryId),
      getTypeNpcStats(typeId, data.categoryId),
      getTypeInsurance(typeId),
      getTypeSynchronizer(typeId, data.groupId, data.categoryId),
    ]);
  // nuqs's React adapter, not the app-wide Next one: the Next adapter reads
  // `useSearchParams()`, which drops this subtree out of the cached render. The
  // React adapter reads `?tab=` (and the Insurance tab's state) after hydration.
  return (
    <NuqsAdapter>
      <TypePage
        {...props}
        dogmaMeta={dogmaMeta}
        variations={variations}
        typeLists={typeLists}
        npcStats={npcStats}
        insurance={insurance}
        synchronizer={synchronizer}
      />
    </NuqsAdapter>
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
