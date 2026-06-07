import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";

import { prisma } from "@jitaspace/db";

import LPStorePage from "./page.client";
import type { LPStorePageProps } from "./page.client";

export const metadata = {
  title: "LP Store",
  description:
    "Browse EVE Online Loyalty Point store offers — find what you can buy with LP from NPC corporations.",
};

export default async function Page() {
  "use cache";
  cacheLife("days");
  let corporations: LPStorePageProps["corporations"] = [];
  try {
    const corporationIds = (
      await prisma.loyaltyStoreOffer.groupBy({
        by: ["corporationId"],
      })
    ).map(({ corporationId }) => corporationId);

    corporations = await prisma.corporation.findMany({
      select: {
        corporationId: true,
        name: true,
      },
      where: {
        corporationId: { in: corporationIds },
      },
    });
  } catch {
    notFound();
  }

  const sortedCorporations = [...corporations].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return <LPStorePage corporations={sortedCorporations} />;
}
