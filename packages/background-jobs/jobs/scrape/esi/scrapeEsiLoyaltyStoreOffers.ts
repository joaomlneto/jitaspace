import pLimit from "p-limit";

import {
  getCorporationsNpccorps,
  getLoyaltyStoresCorporationIdOffers,
} from "@jitaspace/esi-client";

import { defineJob } from "../../../core";
import { prisma } from "../../../db";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { excludeObjectKeys, updateTable } from "../../../utils";

export interface ScrapeLoyaltyStoreOffersEventPayload {
  data: {
    corporationIds?: number[];
    batchSize?: number;
  };
}

async function fetchCorporationLoyaltyStoreOffers(corporationId: number) {
  const res = await getLoyaltyStoresCorporationIdOffers(corporationId);
  return res.data.map((offer) => ({ corporationId, ...offer }));
}

export const scrapeEsiLoyaltyStoreOffers = defineJob<
  ScrapeLoyaltyStoreOffersEventPayload["data"]
>({
  id: "scrape-esi-loyalty-store-offers",
  trigger: { type: "event" },
  name: "Scrape LoyaltyStoreOffers",
  concurrencyLimit: 1,
  retries: 5,
  handler: async (ctx) => {
    const corporationIds: number[] =
      ctx.payload.corporationIds ??
      (await getCorporationsNpccorps().then((res) => res.data));

    const limit = pLimit(20);

    // Split IDs in batches
    corporationIds.sort((a, b) => a - b);
    const stepStartTime = performance.now();

    await createCorpAndItsRefRecords({
      missingCorporationIds: new Set(corporationIds),
    });

    const thisBatchLoyaltyStoreOffers = (
      await Promise.all(
        corporationIds.map((corporationId) =>
          limit(() => fetchCorporationLoyaltyStoreOffers(corporationId)),
        ),
      )
    ).flat();

    const requiredItems = thisBatchLoyaltyStoreOffers.flatMap((offer) =>
      offer.required_items.map((item) => ({
        ...item,
        offerId: offer.offer_id,
        corporationId: offer.corporationId,
      })),
    );

    const loyaltyStoreOfferChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.loyaltyStoreOffer
          .findMany({
            where: {
              //offerId: { in: offerIds },
              corporationId: { in: corporationIds },
            },
          })
          .then((entries) =>
            entries.map((entry) =>
              excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
            ),
          ),
      fetchRemoteEntries: () =>
        Promise.resolve(
          thisBatchLoyaltyStoreOffers.map((offer) => ({
            offerId: offer.offer_id,
            corporationId: offer.corporationId,
            typeId: offer.type_id,
            quantity: offer.quantity,
            akCost: offer.ak_cost ?? null,
            iskCost: BigInt(offer.isk_cost),
            lpCost: BigInt(offer.lp_cost),
            isDeleted: false,
          })),
        ),
      batchCreate: (entries) => {
        return limit(() =>
          prisma.loyaltyStoreOffer.createMany({
            data: entries,
          }),
        );
      },
      batchDelete: (entries) =>
        prisma.loyaltyStoreOffer.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            offerId: {
              in: entries.map((entry) => entry.offerId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.loyaltyStoreOffer.update({
                data: entry,
                where: {
                  offerId_corporationId: {
                    offerId: entry.offerId,
                    corporationId: entry.corporationId,
                  },
                },
              }),
            ),
          ),
        ),
      idAccessor: (e) => `${e.offerId}:${e.corporationId}`,
    });

    const loyaltyStoreOfferRequiredItemsChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.loyaltyStoreOfferRequiredItem
          .findMany({
            where: {
              corporationId: { in: corporationIds },
            },
          })
          .then((entries) =>
            entries.map((entry) =>
              excludeObjectKeys(entry, ["updatedAt", "createdAt"]),
            ),
          ),
      fetchRemoteEntries: () =>
        Promise.resolve(
          requiredItems.map((item) => ({
            offerId: item.offerId,
            corporationId: item.corporationId,
            typeId: item.type_id,
            quantity: item.quantity,
            isDeleted: false,
          })),
        ),
      batchCreate: (entries) => {
        return limit(() =>
          prisma.loyaltyStoreOfferRequiredItem.createMany({
            data: entries,
          }),
        );
      },
      batchDelete: (entries) =>
        prisma.loyaltyStoreOfferRequiredItem.updateMany({
          data: {
            isDeleted: true,
          },
          where: {
            offerId: {
              in: entries.map((entry) => entry.offerId),
            },
          },
        }),
      batchUpdate: (entries) =>
        Promise.all(
          entries.map((entry) =>
            limit(async () =>
              prisma.loyaltyStoreOfferRequiredItem.update({
                data: entry,
                where: {
                  offerId_corporationId_typeId: {
                    offerId: entry.offerId,
                    corporationId: entry.corporationId,
                    typeId: entry.typeId,
                  },
                },
              }),
            ),
          ),
        ),
      idAccessor: (e) => `${e.offerId}:${e.corporationId}:${e.typeId}`,
    });

    const elapsedTime = performance.now() - stepStartTime;

    return {
      loyaltyStoreOfferChanges,
      loyaltyStoreOfferRequiredItemsChanges,
      elapsedTime,
    };
  },
});
