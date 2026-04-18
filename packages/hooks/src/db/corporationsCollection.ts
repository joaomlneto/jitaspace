import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { CorporationsDetail } from "@jitaspace/esi-client";
import { getCorporationsCorporationId } from "@jitaspace/esi-client";

import type { WithId } from "./core";
import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const corporationsCollection = createQueryCollection<
  WithId<CorporationsDetail, "corporation_id">,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "corporations"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "corporation_id");
      if (id) {
        return [
          {
            ...(await getCorporationsCorporationId(id, {}, {}).then(
              (r) => r.data,
            )),
            corporation_id: id,
          },
        ] as WithId<CorporationsDetail, "corporation_id">[];
      }
      return [] as WithId<CorporationsDetail, "corporation_id">[];
    },
    select: (data: any) => data,
    getKey: (item: WithId<CorporationsDetail, "corporation_id">) =>
      item.corporation_id as number,
    queryClient,
    syncMode: "on-demand",
  }),
);
