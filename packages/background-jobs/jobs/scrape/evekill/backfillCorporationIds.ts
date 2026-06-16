import { defineJob } from "../../../core";
import { getKv } from "../../../kv";

export interface BackfillEveKillCorporationIdsEventPayload {
  data: {
    batchSize?: number;
    url?: string;
  };
}

export const backfillEveKillCorporationIds = defineJob<
  BackfillEveKillCorporationIdsEventPayload["data"]
>({
  id: "backfill-evekill-corporation-ids",
  name: "Backfill Corporation IDs from EVE Kill",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 0,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 100;
    const url = ctx.payload.url;

    // TODO: Retrieve Corporation IDs from EVE Kill API
    const corporationIds: number[] = await fetch(
      url ?? "http://127.0.0.1:8080/corporation_ids2.json",
    ).then((res) => res.json());

    corporationIds.sort((a, b) => a - b);

    console.log(corporationIds.length, "Corporation IDs found");

    const numBatches = Math.ceil(corporationIds.length / batchSize);
    const batches = [...new Array(numBatches).keys()].map((batchId) =>
      corporationIds.slice(batchId * batchSize, (batchId + 1) * batchSize),
    );

    const { kv } = await getKv();
    await kv.queues.corporationIds.addBulk(
      batches.map((batch) => ({
        data: { corporationIds: batch },
        opts: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      })),
    );

    return `#Corporation IDs: ${corporationIds.length} IDs processed in ${batches.length} batches of size ${batchSize}.`;
  },
});
