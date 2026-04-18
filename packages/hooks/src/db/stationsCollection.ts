import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseStationsStationIdGet } from "@jitaspace/esi-client";
import { getUniverseStationsStationId } from "@jitaspace/esi-client";

import type { WithId } from "./core";
import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const stationsCollection = createQueryCollection<
  WithId<UniverseStationsStationIdGet, "station_id">,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "stations"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "station_id");
      if (id) {
        return [
          {
            ...(await getUniverseStationsStationId(id, {}, {}).then(
              (r) => r.data,
            )),
            station_id: id,
          },
        ] as WithId<UniverseStationsStationIdGet, "station_id">[];
      }
      return [] as WithId<UniverseStationsStationIdGet, "station_id">[];
    },
    select: (data: any) => data,
    getKey: (item: WithId<UniverseStationsStationIdGet, "station_id">) =>
      item.station_id as number,
    queryClient,
    syncMode: "on-demand",
  }),
);
