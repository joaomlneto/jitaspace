import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { DogmaUnit } from "@jitaspace/sde-client";
import { getDogmaUnitById } from "@jitaspace/sde-client";

import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const dogmaUnitsCollection = createQueryCollection<DogmaUnit, number>(
  queryCollectionOptions({
    queryKey: ["sde", "dogma-units"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "unitID");
      if (id) {
        return [await getDogmaUnitById(id).then((r) => r.data)] as DogmaUnit[];
      }
      return [] as DogmaUnit[];
    },
    select: (data: any) => data,
    getKey: (item: DogmaUnit) => item.unitID,
    queryClient,
    syncMode: "on-demand",
  }),
);
