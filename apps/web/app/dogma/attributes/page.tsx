import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";

import { prisma } from "@jitaspace/db";

import DogmaAttributesPage from "./page.client";
import type { PageProps } from "./page.client";

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
    count.forEach(
      (entry) => (map[entry.attributeId]!.numTypeIds = entry._count.attributeId),
    );

    attributes = map;
  } catch {
    notFound();
  }

  return <DogmaAttributesPage attributes={attributes} />;
}
