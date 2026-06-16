import type { GetWarsWarId200 } from "@jitaspace/esi-client";

import { defineJob } from "../../../core";
import { getKv } from "../../../kv";
import { downloadTarBz2FileAndParseJson } from "../../../utils/downloadFile.ts";

export interface BackfillEveRefWarsEventPayload {
  data: {
    url: string;
    batchSize?: number;
    skipBatches?: number;
  };
}

export type EveRefWarSchema = Omit<GetWarsWarId200, "id"> & {
  war_id: number; // war_id
  http_last_modified: string;
};

export const backfillEveRefWars = defineJob<
  BackfillEveRefWarsEventPayload["data"]
>({
  id: "backfill-everef-wars",
  name: "Backfill Wars from EVE Ref",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 5,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 100;
    const url = ctx.payload.url;

    if (!url) {
      throw new Error("No URL provided.");
    }

    // Retrieve and extract war archive files from EVE Ref
    const files = (
      (await downloadTarBz2FileAndParseJson(url)) as {
        name: string;
        content: EveRefWarSchema;
      }[]
    ).filter((file) => !file.name.includes("killmails"));

    console.log("Got files!");

    const numBatches = Math.ceil(files.length / batchSize);
    const batches = [...new Array(numBatches).keys()].map((batchId) =>
      files.slice(batchId * batchSize, (batchId + 1) * batchSize),
    );

    const { kv } = await getKv();
    for (const batch of batches) {
      await kv.queues.war.add(
        batch.map((file) => ({
          ...file.content,
          id: file.content.war_id,
        })),
        {
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    console.log("done");

    return files.slice(0, 100).map((file) => file.name);
  },
});
