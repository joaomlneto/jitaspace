import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { UniverseGroupsGroupIdGet } from "@jitaspace/esi-client";
import { getUniverseGroupsGroupId } from "@jitaspace/esi-client";

import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const groupsCollection = createQueryCollection<
  UniverseGroupsGroupIdGet,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "groups"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "group_id");
      if (id) {
        return [
          await getUniverseGroupsGroupId(id, {}, {}).then((r) => r.data),
        ] as UniverseGroupsGroupIdGet[];
      }
      return [] as UniverseGroupsGroupIdGet[];
    },
    select: (data: any) => data,
    getKey: (item: UniverseGroupsGroupIdGet) => item.group_id,
    queryClient,
    syncMode: "on-demand",
  }),
);
