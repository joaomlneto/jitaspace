import axios from "axios";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getCorporationsNpccorps,
  getLoyaltyStoresCorporationIdOffers,
} from "@jitaspace/esi-client-kubb";

import { client } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";


export type ScrapeLoyaltyStoreOffersEventPayload = {
  data: {
    corporationIds?: number[];
    batchSize?: number;
  };
};

export const scrapeEsiLoyaltyStoreOffers = client.createFunction(
  {
    id: "scrape-esi-loyalty-store-offers",
    name: "Scrape LoyaltyStoreOffers",
    concurrency: {
      limit: 1,
    },
    retries: 5,
  },
  { event: "scrape/esi/loyalty-store-offers" },
  async ({ event }) => {
    let corporationIds: number[] =
      event.data.corporationIds ??
      (await getCorporationsNpccorps().then((res) => res.data));

    const limit = pLimit(20);

    // Split IDs in batches
    corporationIds.sort((a, b) => a - b);
    const stepStartTime = performance.now();

    const thisBatchLoyaltyStoreOffers = (
      await Promise.all(
        corporationIds.map((corporationId) =>
          limit(async () =>
            getLoyaltyStoresCorporationIdOffers(corporationId).then((res) =>
              res.data.map((offer) => ({ corporationId, ...offer })),
            ),
          ),
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
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        thisBatchLoyaltyStoreOffers.map((offer) => ({
          offerId: offer.offer_id,
          corporationId: offer.corporationId,
          typeId: offer.type_id,
          quantity: offer.quantity,
          akCost: offer.ak_cost ?? null,
          iskCost: offer.isk_cost,
          lpCost: offer.lp_cost,
          isDeleted: false,
        })),
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
            entries.map((entry) => excludeObjectKeys(entry, ["updatedAt"])),
          ),
      fetchRemoteEntries: async () =>
        requiredItems.map((item) => ({
          offerId: item.offerId,
          corporationId: item.corporationId,
          typeId: item.type_id,
          quantity: item.quantity,
          isDeleted: false,
        })),
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
);
