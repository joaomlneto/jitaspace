import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseRacesGet } from "@jitaspace/esi-client";
import { getUniverseRaces } from "@jitaspace/esi-client";

import { createQueryCollection, queryClient } from "./core";

export const racesCollection = createQueryCollection<
  UniverseRacesGet[number],
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "races"],
    queryFn: async () => getUniverseRaces().then((r) => r.data as any),
    select: (data: any) => data,
    getKey: (item: UniverseRacesGet[number]) => item.race_id,
    queryClient,
    syncMode: "eager",
  }),
);
