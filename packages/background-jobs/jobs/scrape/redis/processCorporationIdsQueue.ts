import { defineJob } from "../../../core";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { drainQueue } from "./drainQueue";

export interface ProcessRedisCorporationIdsQueueEventPayload {
  data: {};
}

export const processRedisCorporationIds = defineJob<
  ProcessRedisCorporationIdsQueueEventPayload["data"]
>({
  id: "process-redis-corporation-ids",
  name: "Process Corporation IDs from Redis Queue",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 0,
  handler: async (ctx) => {
    const processed = await drainQueue<{ corporationIds: number[] }>(
      "corporationIds",
      async (job) => {
        await createCorpAndItsRefRecords({
          missingCorporationIds: new Set(job.data.corporationIds),
        });
      },
    );

    ctx.logger.info(
      `Processed ${processed} corporation-id batch(es) from queue.`,
    );
    return { processed };
  },
});
