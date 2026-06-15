import type { Metadata } from "next";
import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import type { PageProps } from "./page.client";
import { PageSkeleton } from "~/components/PageSkeleton";
import { prisma } from "~/lib/db";
import DogmaAttributePage from "./page.client";

async function getAttributeData(attributeId: number): Promise<PageProps> {
  "use cache";
  cacheLife("days");

  const attribute = await prisma.dogmaAttribute.findUnique({
    select: {
      attributeId: true,
      name: true,
      displayName: true,
      description: true,
      defaultValue: true,
      highIsGood: true,
      published: true,
      stackable: true,
      unitId: true,
      DogmaUnit: {
        select: {
          name: true,
          displayName: true,
        },
      },
      iconId: true,
      TypeAttributes: {
        select: {
          type: {
            select: {
              typeId: true,
              name: true,
              groupId: true,
            },
          },
          value: true,
        },
      },
    },
    where: {
      attributeId,
    },
  });

  if (!attribute) {
    notFound();
  }

  const groupIds = [
    ...new Set(attribute.TypeAttributes.map((type) => type.type.groupId)),
  ];

  const groups = await prisma.group.findMany({
    select: {
      groupId: true,
      name: true,
    },
    where: {
      groupId: {
        in: groupIds,
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return {
    attributeId,
    title: attribute.displayName ?? attribute.name ?? null,
    name: attribute.name,
    displayName: attribute.displayName,
    description: attribute.description ?? null,
    defaultValue: attribute.defaultValue ?? null,
    highIsGood: attribute.highIsGood ?? null,
    published: attribute.published ?? null,
    stackable: attribute.stackable ?? null,
    unit: attribute.DogmaUnit?.displayName ?? attribute.DogmaUnit?.name ?? null,
    unitId: attribute.unitId ?? null,
    iconId: attribute.iconId ?? null,
    types: attribute.TypeAttributes.map((entry) => ({
      ...entry.type,
      value: entry.value,
    })),
    groups,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ attributeId: string }>;
}): Promise<Metadata> {
  const { attributeId: raw } = await params;
  const attributeId = Number(raw);
  if (!Number.isSafeInteger(attributeId) || attributeId <= 0) return {};
  try {
    const attribute = await prisma.dogmaAttribute.findUnique({
      select: { name: true, displayName: true, description: true },
      where: { attributeId },
    });
    if (!attribute) return {};
    const title =
      [attribute.displayName, attribute.name].find((value) => value) ??
      undefined;
    const description = attribute.description?.slice(0, 200) ?? undefined;
    return { title, description };
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ attributeId: string }>;
}>) {
  const { attributeId: attributeIdParam } = await params;
  const attributeId = Number(attributeIdParam);
  if (!Number.isFinite(attributeId)) {
    notFound();
  }

  const props = await getAttributeData(attributeId);

  return <DogmaAttributePage {...props} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ attributeId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
