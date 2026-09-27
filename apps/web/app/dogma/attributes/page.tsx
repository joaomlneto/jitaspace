import { cacheLife } from "next/cache";

import type { PageProps } from "./page.client";
import { prisma } from "~/lib/db";
import { pageMetadata } from "~/lib/metadata";
import DogmaAttributesPage from "./page.client";

export const metadata = pageMetadata({
  title: "Dogma Attributes",
  description:
    "Browse all EVE Online dogma attributes used in ship and module balancing.",
  path: "/dogma/attributes",
  badge: "Dogma",
});

export default async function Page() {
  "use cache";
  cacheLife("days");
  // Deliberately uncaught. A catch here — inside the `"use cache"` scope —
  // would make `notFound()` a *successful* render that Next stores and serves
  // for the whole `cacheLife` window. Throwing writes nothing to the cache, so
  // the route recovers as soon as the database does. See CLAUDE.md → "Never
  // catch a database error inside a `"use cache"` scope".
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
