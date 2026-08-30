import { cacheLife } from "next/cache";

import type { PageProps } from "./page.client";
import { prisma } from "~/lib/db";
import DogmaEffectsPage from "./page.client";

export const metadata = {
  title: "Dogma Effects",
  description:
    "Browse all EVE Online dogma effects applied by ships, modules, and skills.",
};

export default async function Page() {
  "use cache";
  cacheLife("days");
  // Deliberately uncaught: a catch inside this `"use cache"` scope would cache
  // the failure as a day-long 404 (e60062ec). Throwing keeps the last good entry.
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
