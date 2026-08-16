import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { HttpStatusCode } from "axios";

import type { PageProps } from "./page.client";
import type { TypeDogmaMeta } from "./types";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import TypePage from "./page.client";
import { emptyTypeDogmaMeta } from "./types";

function stripHtml(s: string): string {
  let out = "";
  let inTag = false;
  for (const ch of s) {
    if (ch === "<") inTag = true;
    else if (ch === ">") inTag = false;
    else if (!inTag) out += ch;
  }
  return out;
}

async function getTypeData(typeId: number): Promise<PageProps> {
  "use cache";
  cacheLife("days");

  const type = await prisma.type.findUniqueOrThrow({
    select: {
      typeId: true,
      name: true,
      description: true,
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

  return {
    typeId,
    ogImageUrl: `https://images.evetech.net/types/${typeId}/${variation}`,
    typeName: type.name,
    typeDescription: type.description,
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
  const typeId = Number(typeIdParam);
  if (!typeId) return {};

  try {
    const { typeName, typeDescription, ogImageUrl } = await getTypeData(typeId);
    const description = typeDescription
      ? stripHtml(typeDescription).slice(0, 200)
      : undefined;
    return {
      title: typeName ?? undefined,
      description,
      openGraph: {
        title: typeName ?? undefined,
        description,
        images: ogImageUrl ? [{ url: ogImageUrl, width: 64, height: 64 }] : [],
      },
      twitter: {
        card: "summary",
        title: typeName ?? undefined,
        description,
        images: ogImageUrl ? [ogImageUrl] : [],
      },
    };
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
  const typeId = Number(typeIdParam);
  if (!typeId) {
    notFound();
  }

  let props: PageProps;
  try {
    props = await getTypeData(typeId);
  } catch {
    notFound();
  }
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
