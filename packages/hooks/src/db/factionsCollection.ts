import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseFactionsGet } from "@jitaspace/esi-client";
import { getUniverseFactions } from "@jitaspace/esi-client";

import { createQueryCollection, queryClient } from "./core";

export const factionsCollection = createQueryCollection<
  UniverseFactionsGet[number],
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "factions"],
    queryFn: async () => getUniverseFactions().then((r) => r.data as any),
    select: (data: any) => data,
    getKey: (item: UniverseFactionsGet[number]) => item.faction_id,
    queryClient,
    syncMode: "eager",
  }),
);
