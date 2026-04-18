import { queryCollectionOptions } from "@tanstack/query-db-collection";

import type { KillmailsKillmailIdKillmailHashGet } from "@jitaspace/esi-client";
import { getKillmailsKillmailIdKillmailHash } from "@jitaspace/esi-client";

import type { WithId } from "./core";
import { createQueryCollection, extractIdFromCtx, queryClient } from "./core";

export const killmailsCollection = createQueryCollection<
  WithId<KillmailsKillmailIdKillmailHashGet, "killmail_hash">,
  number
>(
  queryCollectionOptions({
    queryKey: ["esi", "killmails"],
    queryFn: async (ctx) => {
      const id = extractIdFromCtx(ctx, "killmail_id");
      const hash = extractIdFromCtx(ctx, "killmail_hash");
      if (id && hash) {
        return [
          {
            ...(await getKillmailsKillmailIdKillmailHash(id, hash, {}, {}).then(
              (r) => r.data,
            )),
            killmail_hash: hash,
          },
        ] as WithId<KillmailsKillmailIdKillmailHashGet, "killmail_hash">[];
      }
      return [] as WithId<
        KillmailsKillmailIdKillmailHashGet,
        "killmail_hash"
      >[];
    },
    select: (data: any) => data,
    getKey: (
      item: WithId<KillmailsKillmailIdKillmailHashGet, "killmail_hash">,
    ) => item.killmail_id as number,
    queryClient,
    syncMode: "on-demand",
  }),
);
