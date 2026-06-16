import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

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
  let effects: PageProps["effects"] = {};
  try {
    const map: PageProps["effects"] = {};

    const results = await prisma.dogmaEffect.findMany({
      select: {
        effectId: true,
        name: true,
        displayName: true,
      },
    });
    results.forEach(
      (effect) =>
        (map[effect.effectId] = {
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
      const effect = map[entry.effectId];
      if (effect) effect.numTypeIds = entry._count.effectId;
    });

    effects = map;
  } catch {
    notFound();
  }

  return <DogmaEffectsPage effects={effects} />;
}
