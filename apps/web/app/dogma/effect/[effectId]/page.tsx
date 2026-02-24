import { notFound } from "next/navigation";

import { prisma } from "@jitaspace/db";

import DogmaEffectPage from "./page.client";
import type { PageProps } from "./page.client";

export const revalidate = 86400;

export default async function Page({
  params,
}: {
  params: Promise<{ effectId: string }>;
}) {
  const { effectId: effectIdParam } = await params;
  const effectId = Number(effectIdParam);
  try {
    if (!Number.isFinite(effectId)) {
      notFound();
    }
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

    const props: PageProps = {
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
    return <DogmaEffectPage {...props} />;
  } catch {
    notFound();
  }
}
