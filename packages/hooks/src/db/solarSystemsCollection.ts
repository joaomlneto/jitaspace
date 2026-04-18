import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseSystemsSystemIdGet } from "@jitaspace/esi-client";
import { getUniverseSystemsSystemId } from "@jitaspace/esi-client";

import type { WithId } from "./core";
import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const solarSystemsCollection = createQueryCollection<
  WithId<UniverseSystemsSystemIdGet, "system_id">,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "solar-systems"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "system_id");
      if (id) {
        return [
          {
            ...(await getUniverseSystemsSystemId(id, {}, {}).then(
              (r) => r.data,
            )),
            system_id: id,
          },
        ] as WithId<UniverseSystemsSystemIdGet, "system_id">[];
      }
      return [] as WithId<UniverseSystemsSystemIdGet, "system_id">[];
    },
    select: (data: any) => data,
    getKey: (item: WithId<UniverseSystemsSystemIdGet, "system_id">) =>
      item.system_id as number,
    queryClient,
    syncMode: "on-demand",
  }),
);
