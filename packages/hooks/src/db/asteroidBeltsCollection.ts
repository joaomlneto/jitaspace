import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseAsteroidBeltsAsteroidBeltIdGet } from "@jitaspace/esi-client";
import { getUniverseAsteroidBeltsAsteroidBeltId } from "@jitaspace/esi-client";

import type { WithId } from "./core";
import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const asteroidBeltsCollection = createQueryCollection<
  WithId<UniverseAsteroidBeltsAsteroidBeltIdGet, "asteroid_belt_id">,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "asteroid-belts"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "asteroid_belt_id");
      if (id) {
        return [
          {
            ...(await getUniverseAsteroidBeltsAsteroidBeltId(id, {}, {}).then(
              (r) => r.data,
            )),
            asteroid_belt_id: id,
          },
        ] as WithId<
          UniverseAsteroidBeltsAsteroidBeltIdGet,
          "asteroid_belt_id"
        >[];
      }
      return [] as WithId<
        UniverseAsteroidBeltsAsteroidBeltIdGet,
        "asteroid_belt_id"
      >[];
    },
    select: (data: any) => data,
    getKey: (
      item: WithId<UniverseAsteroidBeltsAsteroidBeltIdGet, "asteroid_belt_id">,
    ) => item.asteroid_belt_id as number,
    queryClient,
    syncMode: "on-demand",
  }),
);
