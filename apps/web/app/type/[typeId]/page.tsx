import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import { HttpStatusCode } from "axios";

import type { PageProps } from "./page.client";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import TypePage from "./page.client";

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

  // Reference metadata for this type's dogma attributes: display name, icon,
  // unit symbol and category. The client used to fetch this one attribute (and
  // one unit, and one category) at a time from the SDE API; it is static data,
  // so it is resolved here in a single query and cached with the page.
  const typeAttributes = await prisma.typeAttribute.findMany({
    select: {
      attributeId: true,
      attribute: {
        select: {
          name: true,
          displayName: true,
          iconId: true,
          unitId: true,
          attributeCategoryId: true,
          DogmaUnit: { select: { displayName: true, name: true } },
        },
      },
    },
    where: { typeId },
    orderBy: { attributeId: "asc" },
  });

  const categoryIds = [
    ...new Set(
      typeAttributes
        .map((entry) => entry.attribute.attributeCategoryId)
        .filter((id): id is number => id !== null),
    ),
  ];

  const categories = await prisma.dogmaAttributeCategory.findMany({
    select: { attributeCategoryId: true, name: true },
    where: { attributeCategoryId: { in: categoryIds } },
  });
  const categoryNameById = new Map(
    categories.map((category) => [category.attributeCategoryId, category.name]),
  );

  const dogmaAttributeMeta = typeAttributes.map((entry) => ({
    attributeId: entry.attributeId,
    name: entry.attribute.name,
    displayName: entry.attribute.displayName,
    iconId: entry.attribute.iconId,
    unitId: entry.attribute.unitId,
    unitSymbol:
      entry.attribute.DogmaUnit?.displayName ??
      entry.attribute.DogmaUnit?.name ??
      null,
    categoryId: entry.attribute.attributeCategoryId,
    categoryName:
      entry.attribute.attributeCategoryId === null
        ? null
        : (categoryNameById.get(entry.attribute.attributeCategoryId) ?? null),
  }));

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
    dogmaAttributeMeta,
  };
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
  return <TypePage {...props} />;
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
