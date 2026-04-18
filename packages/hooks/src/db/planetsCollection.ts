import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniversePlanetsPlanetIdGet } from "@jitaspace/esi-client";
import { getUniversePlanetsPlanetId } from "@jitaspace/esi-client";

import type { WithId } from "./core";
import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const planetsCollection = createQueryCollection<
  WithId<UniversePlanetsPlanetIdGet, "planet_id">,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "planets"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "planet_id");
      if (id) {
        return [
          {
            ...(await getUniversePlanetsPlanetId(id, {}, {}).then(
              (r) => r.data,
            )),
            planet_id: id,
          },
        ] as WithId<UniversePlanetsPlanetIdGet, "planet_id">[];
      }
      return [] as WithId<UniversePlanetsPlanetIdGet, "planet_id">[];
    },
    select: (data: any) => data,
    getKey: (item: WithId<UniversePlanetsPlanetIdGet, "planet_id">) =>
      item.planet_id as number,
    queryClient,
    syncMode: "on-demand",
  }),
);
