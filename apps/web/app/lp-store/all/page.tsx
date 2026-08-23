import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

import type { LPStoreAllPageProps } from "./page.client";
import { prisma } from "~/lib/db";
import { collectLpStoreOfferTypeIds } from "./collectTypeIds";
import { encodeOffer } from "./encoding";
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
        // Needed to join, not to render — `encodeOffer` drops both, since an
        // item nested under its offer already knows which offer it belongs to.
        offerId: true,
        corporationId: true,
      },
    });

    // An offer is identified by (offerId, corporationId): the same offerId
    // recurs across corporations. Grouping once turns what was a `.filter()`
    // per offer — 33k offers x 36k items, about 1.2 billion comparisons on
    // every cache fill — into a single pass.
    const itemsByOffer = new Map<
      string,
      { typeId: number; quantity: number }[]
    >();
    for (const item of requiredItems) {
      const key = `${item.offerId}:${item.corporationId}`;
      const group = itemsByOffer.get(key);
      const entry = { typeId: item.typeId, quantity: item.quantity };
      if (group) group.push(entry);
      else itemsByOffer.set(key, [entry]);
    }

    offers = offersWithoutRequiredItems.map((offer) =>
      encodeOffer({
        ...offer,
        requiredItems:
          itemsByOffer.get(`${offer.offerId}:${offer.corporationId}`) ?? [],
        iskCost: Number(offer.iskCost),
        lpCost: Number(offer.lpCost),
      }),
    );

    const typeIds = collectLpStoreOfferTypeIds(
      offersWithoutRequiredItems,
      requiredItems,
    );

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
