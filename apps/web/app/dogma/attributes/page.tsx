import { notFound } from "next/navigation";

import { prisma } from "@jitaspace/db";

import DogmaAttributesPage from "./page.client";
import type { PageProps } from "./page.client";

export const revalidate = 86400;

export default async function Page() {
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
