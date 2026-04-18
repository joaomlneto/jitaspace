import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseConstellationsConstellationIdGet } from "@jitaspace/esi-client";
import { getUniverseConstellationsConstellationId } from "@jitaspace/esi-client";

import type { WithId } from "./core";
import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const constellationsCollection = createQueryCollection<
  WithId<UniverseConstellationsConstellationIdGet, "constellation_id">,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "constellations"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "constellation_id");
      if (id) {
        return [
          {
            ...(await getUniverseConstellationsConstellationId(id, {}, {}).then(
              (r) => r.data,
            )),
            constellation_id: id,
          },
        ] as WithId<
          UniverseConstellationsConstellationIdGet,
          "constellation_id"
        >[];
      }
      return [] as WithId<
        UniverseConstellationsConstellationIdGet,
        "constellation_id"
      >[];
    },
    select: (data: any) => data,
    getKey: (
      item: WithId<
        UniverseConstellationsConstellationIdGet,
        "constellation_id"
      >,
    ) => item.constellation_id as number,
    queryClient,
    syncMode: "on-demand",
  }),
);
