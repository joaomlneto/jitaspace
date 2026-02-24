import { notFound } from "next/navigation";
import LPStorePage from "./page.client";
import type { LPStorePageProps } from "./page.client";

import { prisma } from "@jitaspace/db";

export const revalidate = 86400;

export default async function Page() {
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
