import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import type { PageProps } from "./page.client";
import { prisma } from "~/lib/db";
import ShipScannerPage from "./page.client";

const SHIP_CATEGORY_ID = 6;

export default async function Page() {
  "use cache";
  cacheLife("days");
  // Database errors are deliberately uncaught: catching them inside this
  // `"use cache"` scope would make `notFound()` a *successful* render that Next
  // stores and serves for the whole `cacheLife` window. Throwing writes nothing
  // to the cache. See CLAUDE.md → "Never catch a database error inside a
  // `"use cache"` scope".
  //
  // A genuinely absent ship category is a different thing entirely, and *is* a
  // real 404 — so this reads with `findUnique` and tests for null rather than
  // letting `findUniqueOrThrow` raise an error indistinguishable from an
  // outage. Without that split an empty database fails the build (the CI
  // Cypress job pushes a fresh schema and prerenders against it).
  //
  // The `notFound()` below therefore sits inside the cache scope on purpose:
  // an absent category is a real, stable 404 and *should* be cached. It is the
  // one thing here that is safe to store.
  const shipGroups = await prisma.category.findUnique({
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

  if (!shipGroups) notFound();

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
