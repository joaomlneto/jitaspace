import { eventType, staticSchema } from "inngest";

/**
 * Thanks to Karbowiak for the original code that this is based on!
 */
import { kv } from "../../../kv";

import { client } from "../../../client";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";

export type ProcessRedisCharacterIdsQueueEventPayload = {
  data: {};
};

export const processRedisCharacterIdsEvent = eventType(
  "process/redis/character-ids",
  {
    schema: staticSchema<ProcessRedisCharacterIdsQueueEventPayload["data"]>(),
  },
);

export const processRedisCharacterIds = client.createFunction(
  {
    id: "process-redis-character-ids",
    triggers: [processRedisCharacterIdsEvent],
    name: "Process Character IDs from Redis Queue",
    concurrency: {
      limit: 1,
    },
    retries: 0,
  },
  async ({ event, step, logger }) => {
    console.log("Processing character IDs from Redis queue...");

    await kv.queues.characterIds.process(async (job, done) => {
      console.log("Processing job:", job.id);
      const characterIds = job.data.characterIds;

      await createCorpAndItsRefRecords({
        missingCharacterIds: new Set(characterIds),
      });

      done();
    });

    return "Finished?";
  },
);
