import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseTypesTypeIdGet } from "@jitaspace/esi-client";
import { getUniverseTypesTypeId } from "@jitaspace/esi-client";

import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const typesCollection = createQueryCollection<
  UniverseTypesTypeIdGet,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "types"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "type_id");
      if (id) {
        return [
          await getUniverseTypesTypeId(id, {}, {}).then((r) => r.data),
        ] as UniverseTypesTypeIdGet[];
      }
      return [] as UniverseTypesTypeIdGet[];
    },
    select: (data: any) => data,
    getKey: (item: UniverseTypesTypeIdGet) => item.type_id,
    queryClient,
    syncMode: "on-demand",
  }),
);
