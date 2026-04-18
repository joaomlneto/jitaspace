import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseStarsStarIdGet } from "@jitaspace/esi-client";
import { getUniverseStarsStarId } from "@jitaspace/esi-client";

import type { WithId } from "./core";
import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const starsCollection = createQueryCollection<
  WithId<UniverseStarsStarIdGet, "star_id">,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "stars"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "star_id");
      if (id) {
        return [
          {
            ...(await getUniverseStarsStarId(id, {}, {}).then((r) => r.data)),
            star_id: id,
          },
        ] as WithId<UniverseStarsStarIdGet, "star_id">[];
      }
      return [] as WithId<UniverseStarsStarIdGet, "star_id">[];
    },
    select: (data: any) => data,
    getKey: (item: WithId<UniverseStarsStarIdGet, "star_id">) =>
      item.star_id as number,
    queryClient,
    syncMode: "on-demand",
  }),
);
