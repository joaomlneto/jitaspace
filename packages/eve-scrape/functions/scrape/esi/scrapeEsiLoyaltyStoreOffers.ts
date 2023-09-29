import axios from "axios";
import pLimit from "p-limit";

import { prisma } from "@jitaspace/db";
import {
  getCorporationsNpccorps,
  getLoyaltyStoresCorporationIdOffers,
} from "@jitaspace/esi-client";

import { inngest } from "../../../client";
import { excludeObjectKeys, updateTable } from "../../../utils";

export type ScrapeLoyaltyStoreOffersEventPayload = {
  data: {
    corporationIds?: number[];
    batchSize?: number;
  };
};

type StatsKey = "loyaltyStoreOffers";

export const scrapeEsiLoyaltyStoreOffers = inngest.createFunction(
  {
    name: "Scrape LoyaltyStoreOffers",
    concurrency: {
      limit: 1,
    },
    retries: 5,
  },
  { event: "scrape/esi/loyalty-store-offers" },
  async ({ step, event }) => {
    // FIXME: THIS SHOULD NOT BE NECESSARY
    axios.defaults.baseURL = "https://esi.evetech.net/latest";

    const batchSize = event.data.batchSize ?? 1000;
    let corporationIds: number[] =
      event.data.corporationIds ??
      (await getCorporationsNpccorps().then((res) => res.data));

    console.log({ corporationIds });
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

    const offerIds = [
      ...new Set(thisBatchLoyaltyStoreOffers.map((offer) => offer.offer_id)),
    ];

    const loyaltyStoreOfferChanges = await updateTable({
      fetchLocalEntries: async () =>
        prisma.loyaltyStoreOffer
          .findMany({
            where: {
              offerId: { in: offerIds },
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
      batchCreate: (entries) =>
        limit(() =>
          prisma.loyaltyStoreOffer.createMany({
            data: entries,
          }),
        ),
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

    return loyaltyStoreOfferChanges;
  },
);
