import { kv } from "@jitaspace/kv";

import { client } from "../../../client";

export type BackfillEveKillCorporationIdsEventPayload = {
  data: {
    batchSize?: number;
    url?: string;
  };
};

type StatsKey = "corporations";

export const backfillEveKillCorporationIds = client.createFunction(
  {
    id: "backfill-evekill-corporation-ids",
    name: "Backfill Corporation IDs from EVE Kill",
    concurrency: {
      limit: 1,
    },
    retries: 0,
  },
  { event: "backfill/evekill/corporation-ids" },
  async ({ event, step, logger }) => {
    const batchSize = event.data.batchSize ?? 100;
    const url = event.data.url;

    // TODO: Retrieve Corporation IDs from EVE Kill API
    const corporationIds: number[] = await fetch(
      url ?? "http://127.0.0.1:8080/corporation_ids2.json",
    ).then((res) => res.json());

    corporationIds.sort((a, b) => a - b);

    console.log(corporationIds.length, "Corporation IDs found");

    const numBatches = Math.ceil(corporationIds.length / batchSize);
    const batches = [...Array(numBatches).keys()].map((batchId) =>
      corporationIds.slice(batchId * batchSize, (batchId + 1) * batchSize),
    );

    await kv.queues.corporationIds.addBulk(
      batches.map((batch, i) => ({
        data: { corporationIds: batch },
        opts: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      })),
    );

    return `#Corporation IDs: ${corporationIds.length} IDs processed in ${batches.length} batches of size ${batchSize}.`;
  },
);
