import { cacheLife, cacheTag } from "next/cache";

import type { PageProps } from "./page.client";
import { prisma } from "~/lib/db";
import { pageMetadata } from "~/lib/metadata";
import { readEffectCategories } from "~/lib/readEffectCategories";
import { SDE_CACHE_TAG } from "~/lib/sdeCache";
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
  // Not `cacheSdeRead()`: the categories' names and descriptions are written
  // by our own script, not by the SDE ingest, so the entry keeps a daily
  // `cacheLife` and only adds the SDE tag, as `app/lp-store/page.tsx` does.
  cacheLife("days");
  cacheTag(SDE_CACHE_TAG);
  // Deliberately uncaught. A catch here — inside the `"use cache"` scope —
  // would make `notFound()` a *successful* render that Next stores and serves
  // for the whole `cacheLife` window. Throwing writes nothing to the cache, so
  // the route recovers as soon as the database does. See CLAUDE.md → "Never
  // catch a database error inside a `"use cache"` scope".
  const effects: PageProps["effects"] = {};

  const [results, count, categories] = await Promise.all([
    prisma.dogmaEffect.findMany({
      select: {
        effectId: true,
        name: true,
        displayName: true,
        effectCategoryId: true,
      },
    }),
    prisma.typeEffect.groupBy({
      by: "effectId",
      _count: {
        effectId: true,
      },
    }),
    readEffectCategories(),
  ]);
  results.forEach(
    (effect) =>
      (effects[effect.effectId] = {
        ...effect,
        numTypeIds: 0,
      }),
  );
  count.forEach((entry) => {
    const effect = effects[entry.effectId];
    if (effect) effect.numTypeIds = entry._count.effectId;
  });

  return <DogmaEffectsPage effects={effects} categories={categories} />;
}
