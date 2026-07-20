import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

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
  let attributes: PageProps["attributes"] = {};
  try {
    const map: PageProps["attributes"] = {};

    const results = await prisma.dogmaAttribute.findMany({
      select: {
        attributeId: true,
        name: true,
        displayName: true,
      },
    });
    results.forEach(
      (attribute) =>
        (map[attribute.attributeId] = {
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
      const attribute = map[entry.attributeId];
      if (attribute) attribute.numTypeIds = entry._count.attributeId;
    });

    attributes = map;
  } catch {
    notFound();
  }

  return <DogmaAttributesPage attributes={attributes} />;
}
