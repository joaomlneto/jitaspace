import { notFound } from "next/navigation";

import { prisma } from "@jitaspace/db";

import ShipScannerPage from "./page.client";
import type { PageProps } from "./page.client";

const SHIP_CATEGORY_ID = 6;

export const revalidate = 86400;

export default async function Page() {
  let ships: PageProps["ships"] = [];
  try {
    const shipGroups = await prisma.category.findUniqueOrThrow({
      select: {
        groups: {
          select: {
            groupId: true,
            name: true,
          },
        },
      },
      where: {
        categoryId: SHIP_CATEGORY_ID,
      },
    });

    const shipGroupIds = shipGroups.groups.map((group) => group.groupId);

    const shipTypes = await prisma.type.findMany({
      select: {
        typeId: true,
        name: true,
      },
      where: {
        groupId: {
          in: shipGroupIds,
        },
        published: true,
      },
      orderBy: [{ name: "asc" }],
    });

    ships = shipTypes.map((type) => ({ id: type.typeId, name: type.name }));
  } catch {
    notFound();
  }

  return <ShipScannerPage ships={ships} />;
}
