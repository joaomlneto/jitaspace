import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { NpcCharacter } from "@jitaspace/sde-client";

import {
  createQueryCollection,
  extractIdFromCtx,
  getNpcCharacterByIdOrUndefined,
  queryClient,
} from "./core";

export const agentsCollection = createQueryCollection<NpcCharacter, number>(
  queryCollectionOptions({
    queryKey: ["sde", "agents"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "characterID");
      if (id) {
        const npcCharacter = await getNpcCharacterByIdOrUndefined(id);
        return npcCharacter ? [npcCharacter] : ([] as NpcCharacter[]);
      }
      return [] as NpcCharacter[];
    },
    select: (data: any) => data,
    getKey: (item: NpcCharacter) => item.characterID,
    queryClient,
    syncMode: "on-demand",
  }),
);
