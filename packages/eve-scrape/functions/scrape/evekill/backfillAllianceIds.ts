import { kv } from "@jitaspace/kv";

import { client } from "../../../client";

export type BackfillEveKillAllianceIdsEventPayload = {
  data: {
    batchSize?: number;
    url?: string;
  };
};

type StatsKey = "alliances";

export const backfillEveKillAllianceIds = client.createFunction(
  {
    id: "backfill-evekill-alliance-ids",
    name: "Backfill Alliance IDs from EVE Kill",
    concurrency: {
      limit: 1,
    },
    retries: 0,
  },
  { event: "backfill/evekill/alliance-ids" },
  async ({ event, step, logger }) => {
    const batchSize = event.data.batchSize ?? 100;
    const url = event.data.url;

    // TODO: Retrieve Alliance IDs from EVE Kill API
    const allianceIds: number[] = await fetch(
      url ?? "http://127.0.0.1:8080/alliance_ids2.json",
    ).then((res) => res.json());

    allianceIds.sort((a, b) => a - b);

    console.log(allianceIds.length, "Alliance IDs found");

    const numBatches = Math.ceil(allianceIds.length / batchSize);
    const batches = [...Array(numBatches).keys()].map((batchId) =>
      allianceIds.slice(batchId * batchSize, (batchId + 1) * batchSize),
    );

    await kv.queues.allianceIds.addBulk(
      batches.map((batch, i) => ({
        data: { allianceIds: batch },
        opts: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      })),
    );

    return `#Alliance IDs: ${allianceIds.length} IDs processed in ${batches.length} batches of size ${batchSize}.`;
  },
);
