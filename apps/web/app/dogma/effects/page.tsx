import { cacheLife } from "next/cache";

import type { PageProps } from "./page.client";
import { prisma } from "~/lib/db";
import { pageMetadata } from "~/lib/metadata";
import DogmaEffectsPage from "./page.client";

export const metadata = pageMetadata({
  title: "Dogma Effects",
  description:
    "Browse all EVE Online dogma effects applied by ships, modules, and skills.",
  path: "/dogma/effects",
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
  const effects: PageProps["effects"] = {};

  const results = await prisma.dogmaEffect.findMany({
    select: {
      effectId: true,
      name: true,
      displayName: true,
    },
  });
  results.forEach(
    (effect) =>
      (effects[effect.effectId] = {
        ...effect,
        numTypeIds: 0,
      }),
  );

  const count = await prisma.typeEffect.groupBy({
    by: "effectId",
    _count: {
      effectId: true,
    },
  });
  count.forEach((entry) => {
    const effect = effects[entry.effectId];
    if (effect) effect.numTypeIds = entry._count.effectId;
  });

  return <DogmaEffectsPage effects={effects} />;
}
