import { cacheLife } from "next/cache";

import type { PageProps } from "./page.client";
import { prisma } from "~/lib/db";
import DogmaAttributesPage from "./page.client";

export const metadata = {
  title: "Dogma Attributes",
  description:
    "Browse all EVE Online dogma attributes used in ship and module balancing.",
};

export default async function Page() {
  "use cache";
  cacheLife("days");
  // Deliberately uncaught: a catch inside this `"use cache"` scope would cache
  // the failure as a day-long 404 (e60062ec). Throwing keeps the last good entry.
  const attributes: PageProps["attributes"] = {};

  const results = await prisma.dogmaAttribute.findMany({
    select: {
      attributeId: true,
      name: true,
      displayName: true,
    },
  });
  results.forEach(
    (attribute) =>
      (attributes[attribute.attributeId] = {
        ...attribute,
        numTypeIds: 0,
      }),
  );

  const count = await prisma.typeAttribute.groupBy({
    by: "attributeId",
    _count: {
      attributeId: true,
    },
  });
  count.forEach((entry) => {
    const attribute = attributes[entry.attributeId];
    if (attribute) attribute.numTypeIds = entry._count.attributeId;
  });

  return <DogmaAttributesPage attributes={attributes} />;
}
