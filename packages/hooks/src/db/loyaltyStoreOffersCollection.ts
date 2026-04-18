import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { LoyaltyStoresCorporationIdOffersGet } from "@jitaspace/esi-client";
import { getLoyaltyStoresCorporationIdOffers } from "@jitaspace/esi-client";

import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const loyaltyStoreOffersCollection = createQueryCollection<
  LoyaltyStoresCorporationIdOffersGet[number],
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "loyalty-store-offers"],
    queryFn: async (ctx) => {
      const corpId = extractIdFromCtx(ctx, "corporation_id");
      if (corpId) {
        return await getLoyaltyStoresCorporationIdOffers(corpId, {}, {}).then(
          (r) => r.data,
        );
      }
      return [] as LoyaltyStoresCorporationIdOffersGet;
    },
    select: (data: any) => data,
    getKey: (item: LoyaltyStoresCorporationIdOffersGet[number]) =>
      item.offer_id,
    queryClient,
    syncMode: "on-demand",
  }),
);
