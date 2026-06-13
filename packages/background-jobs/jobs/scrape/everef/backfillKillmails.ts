import type { GetKillmailsKillmailIdKillmailHash200 } from "@jitaspace/esi-client";

import type { BatchStepResult } from "../../../types";
import { defineJob } from "../../../core";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { downloadTarBz2FileAndParseJson } from "../../../utils/downloadFile.ts";

export interface BackfillEveRefKillmailsEventPayload {
  data: {
    url: string;
    batchSize?: number;
    skipBatches?: number;
  };
}

export type EveRefKillmailSchema = GetKillmailsKillmailIdKillmailHash200 & {
  http_last_modified: string;
};

type StatsKey = "killmails";

export const backfillEveRefKillmails = defineJob<
  BackfillEveRefKillmailsEventPayload["data"]
>({
  id: "backfill-everef-killmails",
  name: "Backfill Killmails from EVE Ref",
  trigger: { type: "event" },
  concurrencyLimit: 2,
  retries: 5,
  maxDurationSeconds: 3600,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 50;
    const startBatch = ctx.payload.skipBatches ?? 0;
    const url = ctx.payload.url;

    if (!url) {
      throw new Error("No URL provided.");
    }

    const stepStartTime = performance.now();

    // Retrieve and extract killmail archive file from EVE Ref
    const batches: {
      name: string;
      content: EveRefKillmailSchema[];
    }[][] = await ctx.run("Download and extract packages", async () => {
      const files = (await downloadTarBz2FileAndParseJson(url)) as {
        name: string;
        content: EveRefKillmailSchema[];
      }[];

      // Ensure no more than 1000 batches are created
      const boundedBatchSize = Math.max(batchSize, 1 + files.length / 1000);

      const numBatches = Math.ceil(files.length / boundedBatchSize);
      const batches = [...new Array(numBatches).keys()].map((batchId) =>
        files.slice(batchId * batchSize, (batchId + 1) * batchSize),
      );
      return batches;
    });

    for (let i = startBatch; i < batches.length; i++) {
      await ctx.run(
        `Batch ${i + 1}/${batches.length}`,
        async (): Promise<BatchStepResult<StatsKey>> => {
          const batchStartTime = performance.now();

          const remoteEntries: EveRefKillmailSchema[] = batches[i]!.flatMap(
            (file: { content: EveRefKillmailSchema[] }) => file.content,
          );

          await createCorpAndItsRefRecords({
            missingAllianceIds: new Set(
              remoteEntries
                .flatMap((killmail) => [
                  ...killmail.attackers.map((a) => a.alliance_id),
                  killmail.victim.alliance_id,
                ])
                .filter((id) => id != null),
            ),
            missingCharacterIds: new Set(
              remoteEntries
                .flatMap((killmail) => [
                  ...killmail.attackers.map((a) => a.character_id),
                  killmail.victim.character_id,
                ])
                .filter((id) => id != null),
            ),
            missingCorporationIds: new Set(
              remoteEntries
                .flatMap((killmail) => [
                  ...killmail.attackers.map((a) => a.corporation_id),
                  killmail.victim.alliance_id,
                ])
                .filter((id) => id != null),
            ),
            missingFactionIds: new Set(
              remoteEntries
                .flatMap((killmail) => [
                  ...killmail.attackers.map((a) => a.faction_id),
                  killmail.victim.faction_id,
                ])
                .filter((id) => id != null),
            ),
          });

          // Not yet implemented: fetch wars + persist killmails. The
          // updateTable WIP was removed during the background-jobs migration;
          // see git history to recover it.

          return {
            stats: {
              killmails: {
                created: 0,
                deleted: 0,
                modified: 0,
                equal: 0,
              },
            },
            elapsed: performance.now() - batchStartTime,
          };
        },
      );
    }

    return {
      stats: {},
      elapsed: performance.now() - stepStartTime,
    };
  },
});
