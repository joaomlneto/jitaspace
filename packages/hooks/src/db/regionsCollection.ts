import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseRegionsRegionIdGet } from "@jitaspace/esi-client";
import { getUniverseRegionsRegionId } from "@jitaspace/esi-client";

import type { WithId } from "./core";
import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const regionsCollection = createQueryCollection<
  WithId<UniverseRegionsRegionIdGet, "region_id">,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "regions"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "region_id");
      if (id) {
        return [
          {
            ...(await getUniverseRegionsRegionId(id, {}, {}).then(
              (r) => r.data,
            )),
            region_id: id,
          },
        ] as WithId<UniverseRegionsRegionIdGet, "region_id">[];
      }
      return [] as WithId<UniverseRegionsRegionIdGet, "region_id">[];
    },
    select: (data: any) => data,
    getKey: (item: WithId<UniverseRegionsRegionIdGet, "region_id">) =>
      item.region_id as number,
    queryClient,
    syncMode: "on-demand",
  }),
);
