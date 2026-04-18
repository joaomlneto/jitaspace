import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseMoonsMoonIdGet } from "@jitaspace/esi-client";
import { getUniverseMoonsMoonId } from "@jitaspace/esi-client";

import type { WithId } from "./core";
import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const moonsCollection = createQueryCollection<
  WithId<UniverseMoonsMoonIdGet, "moon_id">,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "moons"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "moon_id");
      if (id) {
        return [
          {
            ...(await getUniverseMoonsMoonId(id, {}, {}).then((r) => r.data)),
            moon_id: id,
          },
        ] as WithId<UniverseMoonsMoonIdGet, "moon_id">[];
      }
      return [] as WithId<UniverseMoonsMoonIdGet, "moon_id">[];
    },
    select: (data: any) => data,
    getKey: (item: WithId<UniverseMoonsMoonIdGet, "moon_id">) =>
      item.moon_id as number,
    queryClient,
    syncMode: "on-demand",
  }),
);
