import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseAncestriesGet } from "@jitaspace/esi-client";
import { getUniverseAncestries } from "@jitaspace/esi-client";

import { createQueryCollection, queryClient } from "./core";

export const ancestriesCollection = createQueryCollection<
  UniverseAncestriesGet[number],
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "ancestries"],
    queryFn: async () => getUniverseAncestries().then((r) => r.data as any),
    select: (data: any) => data,
    getKey: (item: UniverseAncestriesGet[number]) => item.id,
    queryClient,
    syncMode: "eager",
  }),
);
