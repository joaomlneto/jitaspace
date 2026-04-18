import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseBloodlinesGet } from "@jitaspace/esi-client";
import { getUniverseBloodlines } from "@jitaspace/esi-client";

import { createQueryCollection, queryClient } from "./core";

export const bloodlinesCollection = createQueryCollection<
  UniverseBloodlinesGet[number],
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "bloodlines"],
    queryFn: async () => getUniverseBloodlines().then((r) => r.data as any),
    select: (data: any) => data,
    getKey: (item: UniverseBloodlinesGet[number]) => item.bloodline_id,
    queryClient,
    syncMode: "eager",
  }),
);
