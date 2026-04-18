import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { MarketsGroupsMarketGroupIdGet } from "@jitaspace/esi-client";
import { getMarketsGroupsMarketGroupId } from "@jitaspace/esi-client";

import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const marketGroupsCollection = createQueryCollection<
  MarketsGroupsMarketGroupIdGet,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "market-groups"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "market_group_id");
      if (id) {
        return [
          await getMarketsGroupsMarketGroupId(id, {}, {}).then((r) => r.data),
        ] as MarketsGroupsMarketGroupIdGet[];
      }
      return [] as MarketsGroupsMarketGroupIdGet[];
    },
    select: (data: any) => data,
    getKey: (item: MarketsGroupsMarketGroupIdGet) => item.market_group_id,
    queryClient,
    syncMode: "on-demand",
  }),
);
