import { cacheLife } from "next/cache";

import type { LPStoreAllPageProps } from "./page.client";
import { prisma } from "~/lib/db";
import { collectLpStoreOfferTypeIds } from "./collectTypeIds";
import LPStoreAllPage from "./page.client";

export const metadata = {
  title: "All LP Store Offers",
  description:
    "Browse all Loyalty Point store offers from every NPC corporation in EVE Online.",
};

export default async function Page() {
  "use cache";
  cacheLife("days");
  // Deliberately uncaught. A catch here — inside the `"use cache"` scope —
  // would make `notFound()` a *successful* render that Next stores and serves
  // for the whole `cacheLife` window. Throwing writes nothing to the cache, so
  // the route recovers as soon as the database does. See CLAUDE.md → "Never
  // catch a database error inside a `"use cache"` scope".
  const corporationIds = (
    await prisma.loyaltyStoreOffer.groupBy({
      by: ["corporationId"],
    })
  ).map(({ corporationId }) => corporationId);

  const corporations: LPStoreAllPageProps["corporations"] =
    await prisma.corporation.findMany({
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

  const offers: LPStoreAllPageProps["offers"] = offersWithoutRequiredItems.map(
    (offer) => ({
      ...offer,
      requiredItems: requiredItems.filter(
        (item) =>
          item.offerId === offer.offerId &&
          item.corporationId === offer.corporationId,
      ),
      iskCost: Number(offer.iskCost),
      lpCost: Number(offer.lpCost),
    }),
  );

  const typeIds = collectLpStoreOfferTypeIds(
    offersWithoutRequiredItems,
    requiredItems,
  );

  const types: LPStoreAllPageProps["types"] = await prisma.type.findMany({
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
  return (
    <LPStoreAllPage corporations={corporations} offers={offers} types={types} />
  );
}
