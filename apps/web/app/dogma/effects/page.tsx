import { notFound } from "next/navigation";

import { prisma } from "@jitaspace/db";

import DogmaEffectsPage from "./page.client";
import type { PageProps } from "./page.client";

export const revalidate = 86400;

export default async function Page() {
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
    count.forEach(
      (entry) => (map[entry.effectId]!.numTypeIds = entry._count.effectId),
    );

    effects = map;
  } catch {
    notFound();
  }

  return <DogmaEffectsPage effects={effects} />;
}
