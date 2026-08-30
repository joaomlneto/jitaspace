import { cacheLife } from "next/cache";

import type { PageProps } from "./page.client";
import { prisma } from "~/lib/db";
import ShipScannerPage from "./page.client";

const SHIP_CATEGORY_ID = 6;

export default async function Page() {
  "use cache";
  cacheLife("days");
  // Deliberately uncaught: a catch inside this `"use cache"` scope would cache
  // the failure as a day-long 404 (e60062ec). Throwing keeps the last good entry.
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

  const ships: PageProps["ships"] = shipTypes.map((type) => ({
    id: type.typeId,
    name: type.name,
  }));

  return <ShipScannerPage ships={ships} />;
}
