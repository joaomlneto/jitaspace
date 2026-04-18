import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { DogmaAttributesAttributeIdGet } from "@jitaspace/esi-client";
import { getDogmaAttributesAttributeId } from "@jitaspace/esi-client";

import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const dogmaAttributesCollection = createQueryCollection<
  DogmaAttributesAttributeIdGet,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "dogma-attributes"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "attribute_id");
      if (id) {
        return [
          await getDogmaAttributesAttributeId(id, {}, {}).then((r) => r.data),
        ] as DogmaAttributesAttributeIdGet[];
      }
      return [] as DogmaAttributesAttributeIdGet[];
    },
    select: (data: any) => data,
    getKey: (item: DogmaAttributesAttributeIdGet) => item.attribute_id,
    queryClient,
    syncMode: "on-demand",
  }),
);
