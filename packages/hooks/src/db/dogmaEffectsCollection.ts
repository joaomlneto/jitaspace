import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { DogmaEffectsEffectIdGet } from "@jitaspace/esi-client";
import { getDogmaEffectsEffectId } from "@jitaspace/esi-client";

import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const dogmaEffectsCollection = createQueryCollection<
  DogmaEffectsEffectIdGet,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "dogma-effects"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "effect_id");
      if (id) {
        return [
          await getDogmaEffectsEffectId(id, {}, {}).then((r) => r.data),
        ] as DogmaEffectsEffectIdGet[];
      }
      return [] as DogmaEffectsEffectIdGet[];
    },
    select: (data: any) => data,
    getKey: (item: DogmaEffectsEffectIdGet) => item.effect_id,
    queryClient,
    syncMode: "on-demand",
  }),
);
