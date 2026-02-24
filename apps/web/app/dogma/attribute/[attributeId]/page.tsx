import { notFound } from "next/navigation";

import { prisma } from "@jitaspace/db";

import DogmaAttributePage from "./page.client";
import type { PageProps } from "./page.client";

export const revalidate = 86400;

export default async function Page({
  params,
}: {
  params: Promise<{ attributeId: string }>;
}) {
  const { attributeId: attributeIdParam } = await params;
  const attributeId = Number(attributeIdParam);
  try {
    const attribute = await prisma.dogmaAttribute.findUniqueOrThrow({
      select: {
        attributeId: true,
        name: true,
        displayName: true,
        description: true,
        published: true,
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

    const props: PageProps = {
      attributeId,
      name: attribute.displayName ?? attribute.name ?? null,
      description: attribute.description,
      published: attribute.published,
      types: attribute.TypeAttributes.map((entry) => ({
        ...entry.type,
        value: entry.value,
      })),
      groups,
    };
    return <DogmaAttributePage {...props} />;
  } catch {
    notFound();
  }
}
