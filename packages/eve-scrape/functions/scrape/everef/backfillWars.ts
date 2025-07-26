/**
 * Thanks to Karbowiak for the original code that this is based on!
 */
import pLimit from "p-limit";

import { GetWarsWarId200 } from "@jitaspace/esi-client";
import { kv } from "@jitaspace/kv";

import { client } from "../../../client";
import { BatchStepResult } from "../../../types";
import { downloadTarBz2FileAndParseJson } from "../../../utils/downloadFile.ts";

export type BackfillEveRefWarsEventPayload = {
  data: {
    url: string;
    batchSize?: number;
    skipBatches?: number;
  };
};

export type EveRefWarSchema = Omit<GetWarsWarId200, "id"> & {
  war_id: number; // war_id
  http_last_modified: string;
};

type StatsKey = "wars";

export const backfillEveRefWars = client.createFunction(
  {
    id: "backfill-everef-wars",
    name: "Backfill Wars from EVE Ref",
    concurrency: {
      limit: 1,
    },
    retries: 5,
  },
  { event: "backfill/everef/wars" },
  async ({ event, step, logger }) => {
    const batchSize = event.data.batchSize ?? 50;
    const startBatch = event.data.skipBatches ?? 0;
    const url = event.data.url;

    if (!url) {
      throw new Error("No URL provided.");
    }

    const stepStartTime = performance.now();
    const limit = pLimit(1);

    // Retrieve and extract war archive files from EVE Ref
    const batches = await step.run(
      "Download and extract packages",
      async () => {
        const files = (await downloadTarBz2FileAndParseJson(url)) as {
          name: string;
          content: EveRefWarSchema;
        }[];

        const numBatches = Math.ceil(files.length / batchSize);
        const batches = [...Array(numBatches).keys()].map((batchId) =>
          files.slice(batchId * batchSize, (batchId + 1) * batchSize),
        );

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
      },
    );

    let results: BatchStepResult<StatsKey>[] = [];

    return results;
  },
);
