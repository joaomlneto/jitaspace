import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseStargatesStargateIdGet } from "@jitaspace/esi-client";
import { getUniverseStargatesStargateId } from "@jitaspace/esi-client";

import type { WithId } from "./core";
import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const stargatesCollection = createQueryCollection<
  WithId<UniverseStargatesStargateIdGet, "stargate_id">,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "stargates"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "stargate_id");
      if (id) {
        return [
          {
            ...(await getUniverseStargatesStargateId(id, {}, {}).then(
              (r) => r.data,
            )),
            stargate_id: id,
          },
        ] as WithId<UniverseStargatesStargateIdGet, "stargate_id">[];
      }
      return [] as WithId<UniverseStargatesStargateIdGet, "stargate_id">[];
    },
    select: (data: any) => data,
    getKey: (item: WithId<UniverseStargatesStargateIdGet, "stargate_id">) =>
      item.stargate_id as number,
    queryClient,
    syncMode: "on-demand",
  }),
);
