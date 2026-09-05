import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { HttpStatusCode } from "axios";

import type { PageProps } from "./page.client";
import type { TypeDogmaMeta } from "./types";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import { pageMetadata, toDescription } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import TypePage from "./page.client";
import { emptyTypeDogmaMeta } from "./types";

type TypeData = PageProps & {
  /** 512px artwork for the OpenGraph card — a ship render where one exists. */
  cardImageUrl?: string;
  groupName?: string;
  categoryName?: string;
};

async function getTypeData(typeId: number): Promise<TypeData> {
  "use cache";
  cacheLife("days");

  const type = await prisma.type.findUniqueOrThrow({
    select: {
      typeId: true,
      name: true,
      description: true,
      group: {
        select: { name: true, category: { select: { name: true } } },
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
 * database blip is never what gets written into the day-long cache entry.
 */
async function readTypeDogmaMeta(typeId: number): Promise<TypeDogmaMeta> {
  "use cache";
  cacheLife("days");

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
  const dogmaMeta = await getTypeDogmaMeta(typeId);
  return <TypePage {...props} dogmaMeta={dogmaMeta} />;
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
