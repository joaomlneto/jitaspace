import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseCategoriesCategoryIdGet } from "@jitaspace/esi-client";
import { getUniverseCategoriesCategoryId } from "@jitaspace/esi-client";

import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const categoriesCollection = createQueryCollection<
  UniverseCategoriesCategoryIdGet,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "categories"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "category_id");
      if (id) {
        return [
          await getUniverseCategoriesCategoryId(id, {}, {}).then((r) => r.data),
        ] as UniverseCategoriesCategoryIdGet[];
      }
      return [] as UniverseCategoriesCategoryIdGet[];
    },
    select: (data: any) => data,
    getKey: (item: UniverseCategoriesCategoryIdGet) => item.category_id,
    queryClient,
    syncMode: "on-demand",
  }),
);
