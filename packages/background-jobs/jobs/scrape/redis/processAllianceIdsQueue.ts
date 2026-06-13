import { defineJob } from "../../../core";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { drainQueue } from "./drainQueue";

export interface ProcessRedisAllianceIdsQueueEventPayload {
  data: {};
}

export const processRedisAllianceIds = defineJob<
  ProcessRedisAllianceIdsQueueEventPayload["data"]
>({
  id: "process-redis-alliance-ids",
  name: "Process Alliance IDs from Redis Queue",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 0,
  handler: async (ctx) => {
    const processed = await drainQueue<{ allianceIds: number[] }>(
      "allianceIds",
      async (job) => {
        await createCorpAndItsRefRecords({
          missingAllianceIds: new Set(job.data.allianceIds),
        });
      },
    );

    ctx.logger.info(`Processed ${processed} alliance-id batch(es) from queue.`);
    return { processed };
  },
});
