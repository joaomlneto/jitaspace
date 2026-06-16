import { defineJob } from "../../../core";
import { getKv } from "../../../kv";

export interface BackfillEveKillAllianceIdsEventPayload {
  data: {
    batchSize?: number;
    url?: string;
  };
}

export const backfillEveKillAllianceIds = defineJob<
  BackfillEveKillAllianceIdsEventPayload["data"]
>({
  id: "backfill-evekill-alliance-ids",
  name: "Backfill Alliance IDs from EVE Kill",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 0,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 100;
    const url = ctx.payload.url;

    // TODO: Retrieve Alliance IDs from EVE Kill API
    const allianceIds: number[] = await fetch(
      url ?? "http://127.0.0.1:8080/alliance_ids2.json",
    ).then((res) => res.json());

    allianceIds.sort((a, b) => a - b);

    console.log(allianceIds.length, "Alliance IDs found");

    const numBatches = Math.ceil(allianceIds.length / batchSize);
    const batches = [...new Array(numBatches).keys()].map((batchId) =>
      allianceIds.slice(batchId * batchSize, (batchId + 1) * batchSize),
    );

    const { kv } = await getKv();
    await kv.queues.allianceIds.addBulk(
      batches.map((batch) => ({
        data: { allianceIds: batch },
        opts: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      })),
    );

    return `#Alliance IDs: ${allianceIds.length} IDs processed in ${batches.length} batches of size ${batchSize}.`;
  },
});
