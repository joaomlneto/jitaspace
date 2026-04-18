import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { CharactersDetail } from "@jitaspace/esi-client";
import { getCharactersCharacterId } from "@jitaspace/esi-client";

import type { WithId } from "./core";
import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const charactersCollection = createQueryCollection<
  WithId<CharactersDetail, "character_id">,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "characters"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "character_id");
      if (id) {
        return [
          {
            ...(await getCharactersCharacterId(id, {}, {}).then((r) => r.data)),
            character_id: id,
          },
        ] as WithId<CharactersDetail, "character_id">[];
      }
      return [] as WithId<CharactersDetail, "character_id">[];
    },
    select: (data: any) => data,
    getKey: (item: WithId<CharactersDetail, "character_id">) =>
      item.character_id as number,
    queryClient,
    syncMode: "on-demand",
  }),
);
