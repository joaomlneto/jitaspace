import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseNamesPost } from "@jitaspace/esi-client";
import { postUniverseNames } from "@jitaspace/esi-client";

import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export type EsiName = UniverseNamesPost[number];

export const esiNamesCollection = createQueryCollection<EsiName, number>(
  queryCollectionOptions({
    queryKey: ["esi", "names"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "id");
      if (!id) {
        return [] as EsiName[];
      }

      return postUniverseNames([Number(id)], {}, {}).then(
        (response) => response.data ?? [],
      );
    },
    select: (data: EsiName[]) => data,
    getKey: (item: EsiName) => item.id,
    queryClient,
    syncMode: "on-demand",
  }),
);
