import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";

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
  // ⚠️ Payload-size caveat: this page serialises EVERY NPC LP offer. Measured
  // against live data that is ~31.8k offers + ~35k required items + ~3.4k type
  // names, which is ~5.2 MB of props even after trimming required items to the
  // fields the client reads (~6.5 MB before the trim). That is well over the
  // platform's ~2 MB per-entry data-cache limit, so — exactly as
  // MarketGroupsNavigation warns — the "use cache" entry is silently NOT stored
  // and the three findMany reads plus the grouping below re-run on every
  // request. The O(n) Map grouping keeps that per-request cost cheap; getting
  // the reads themselves out of the hot path would need an architectural change
  // (paginate, or fetch offers per corporation on demand) that is intentionally
  // out of scope here. Watch the DB's top statements after deploying and
  // revisit if this becomes a cost hotspot.
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

    // Group required items by their owning offer in a single O(n) pass, keyed by
    // the offer's composite [offerId, corporationId] primary key. (The previous
    // `offers.map(o => requiredItems.filter(...))` was O(offers × requiredItems)
    // — >1e9 comparisons at this data scale.) Each item is projected down to the
    // { typeId, quantity } the client reads; the offerId/corporationId only
    // exist to drive this join, so we drop them rather than ship them.
    const requiredItemsByOffer = new Map<
      string,
      { typeId: number; quantity: number }[]
    >();
    for (const item of requiredItems) {
      const key = `${item.offerId}:${item.corporationId}`;
      const projected = { typeId: item.typeId, quantity: item.quantity };
      const group = requiredItemsByOffer.get(key);
      if (group) group.push(projected);
      else requiredItemsByOffer.set(key, [projected]);
    }

    offers = offersWithoutRequiredItems.map((offer) => ({
      ...offer,
      requiredItems:
        requiredItemsByOffer.get(`${offer.offerId}:${offer.corporationId}`) ??
        [],
      iskCost: Number(offer.iskCost),
      lpCost: Number(offer.lpCost),
    }));

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
