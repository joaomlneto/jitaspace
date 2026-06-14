import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import type { LPStoreAllPageProps } from "./page.client";
import { prisma } from "~/lib/db";
import LPStoreAllPage from "./page.client";

export const metadata = {
  title: "All LP Store Offers",
  description:
    "Browse all Loyalty Point store offers from every NPC corporation in EVE Online.",
};

export default async function Page() {
  "use cache";
  cacheLife("days");
  let corporations: LPStoreAllPageProps["corporations"] = [];
  let types: LPStoreAllPageProps["types"] = [];
  let offers: LPStoreAllPageProps["offers"] = [];
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

    const offersWithoutRequiredItems = await prisma.loyaltyStoreOffer.findMany({
      select: {
        offerId: true,
        corporationId: true,
        typeId: true,
        quantity: true,
        akCost: true,
        lpCost: true,
        iskCost: true,
      },
    });

    const requiredItems = await prisma.loyaltyStoreOfferRequiredItem.findMany({
      select: {
        typeId: true,
        quantity: true,
        offerId: true,
        corporationId: true,
      },
    });

    offers = offersWithoutRequiredItems.map((offer) => ({
      ...offer,
      requiredItems: requiredItems.filter(
        (item) =>
          item.offerId === offer.offerId &&
          item.corporationId === offer.corporationId,
      ),
      iskCost: Number(offer.iskCost),
      lpCost: Number(offer.lpCost),
    }));

    const typeIds = [
      ...new Set([
        ...offersWithoutRequiredItems.map((offer) => offer.typeId),
        ...requiredItems.map((item) => item.typeId),
      ]),
    ];

    types = await prisma.type.findMany({
      select: {
        typeId: true,
        name: true,
      },
      where: {
        typeId: {
          in: typeIds,
        },
      },
    });
  } catch {
    notFound();
  }
  return (
    <LPStoreAllPage corporations={corporations} offers={offers} types={types} />
  );
}
