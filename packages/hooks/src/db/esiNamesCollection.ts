import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseNamesPost } from "@jitaspace/esi-client";
import { postUniverseNames } from "@jitaspace/esi-client";

import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export type EsiName = UniverseNamesPost[number];

// No explicit type arguments: given only <EsiName, number>, TypeScript does not
// infer the third (TUtils) but defaults it to UtilsRecord, which the config's
// QueryCollectionUtils is not assignable to. Whether tsc reports that depends
// on the order it checks files in, so it surfaced only on some changes. The
// item and key types are fixed by `select` and `getKey` below.
export const esiNamesCollection = createQueryCollection(
  queryCollectionOptions({
    queryKey: ["esi", "names"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "id");
      if (!id) {
        return [] as EsiName[];
      }

      return postUniverseNames([Number(id)], {}, {}).then(
        (response) => response.data,
      );
    },
    select: (data: EsiName[]) => data,
    getKey: (item: EsiName) => item.id,
    queryClient,
    syncMode: "on-demand",
  }),
);
