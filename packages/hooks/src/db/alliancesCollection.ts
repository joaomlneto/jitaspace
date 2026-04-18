import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { AllianceDetail } from "@jitaspace/esi-client";
import { getAlliancesAllianceId } from "@jitaspace/esi-client";

import type { WithId } from "./core";
import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const alliancesCollection = createQueryCollection<
  WithId<AllianceDetail, "alliance_id">,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "alliances"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "alliance_id");
      if (id) {
        return [
          {
            ...(await getAlliancesAllianceId(id, {}, {}).then((r) => r.data)),
            alliance_id: id,
          },
        ] as WithId<AllianceDetail, "alliance_id">[];
      }
      return [] as WithId<AllianceDetail, "alliance_id">[];
    },
    select: (data: any) => data,
    getKey: (item: WithId<AllianceDetail, "alliance_id">) =>
      item.alliance_id as number,
    queryClient,
    syncMode: "on-demand",
  }),
);
