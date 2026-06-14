import { Suspense } from "react";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import { prisma } from "~/lib/db";

import DogmaEffectPage from "./page.client";
import type { PageProps } from "./page.client";

async function getEffectData(effectId: number): Promise<PageProps> {
  "use cache";
  cacheLife("days");

  const effect = await prisma.dogmaEffect.findUniqueOrThrow({
    select: {
      effectId: true,
      name: true,
      displayName: true,
      description: true,
      published: true,
      TypeEffect: {
        select: {
          type: {
            select: {
              typeId: true,
              name: true,
              groupId: true,
            },
          },
          isDefault: true,
        },
      },
      DogmaEffectModifiers: {
        select: {
          modifierIndex: true,
          domain: true,
          targetEffectId: true,
          func: true,
          modifiedAttributeId: true,
          modifyingAttributeId: true,
          operator: true,
          groupId: true,
          skillTypeId: true,
          isDeleted: true,
        },
        orderBy: {
          modifierIndex: "asc",
        },
      },
    },
    where: {
      effectId,
    },
  });

  const groupIds = [
    ...new Set(effect.TypeEffect.map((type) => type.type.groupId)),
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
    effectId,
    name: effect.displayName || effect.name || null,
    description: effect.description || null,
    published: effect.published ?? null,
    modifiers: effect.DogmaEffectModifiers,
    types: effect.TypeEffect.map((entry) => ({
      ...entry.type,
      isDefault: entry.isDefault,
    })),
    groups,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ effectId: string }>;
}): Promise<Metadata> {
  const { effectId: raw } = await params;
  const effectId = Number(raw);
  if (!Number.isSafeInteger(effectId) || effectId <= 0) return {};
  try {
    const effect = await prisma.dogmaEffect.findUnique({
      select: { name: true, displayName: true, description: true },
      where: { effectId },
    });
    if (!effect) return {};
    const title = effect.displayName || effect.name || undefined;
    const description = effect.description?.slice(0, 200) ?? undefined;
    return { title, description };
  } catch {
    return {};
  }
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ effectId: string }>;
}>) {
  const { effectId: effectIdParam } = await params;
  const effectId = Number(effectIdParam);
  if (!Number.isFinite(effectId)) {
    notFound();
  }

  try {
    const props = await getEffectData(effectId);
    return <DogmaEffectPage {...props} />;
  } catch {
    notFound();
  }
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ effectId: string }>;
}>) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
