import { defineJob } from "../../../core";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";
import { drainQueue } from "./drainQueue";

export interface ProcessRedisCharacterIdsQueueEventPayload {
  data: {};
}

export const processRedisCharacterIds = defineJob<
  ProcessRedisCharacterIdsQueueEventPayload["data"]
>({
  id: "process-redis-character-ids",
  name: "Process Character IDs from Redis Queue",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 0,
  handler: async (ctx) => {
    const processed = await drainQueue<{ characterIds: number[] }>(
      "characterIds",
      async (job) => {
        await createCorpAndItsRefRecords({
          missingCharacterIds: new Set(job.data.characterIds),
        });
      },
    );

    ctx.logger.info(
      `Processed ${processed} character-id batch(es) from queue.`,
    );
    return { processed };
  },
});
