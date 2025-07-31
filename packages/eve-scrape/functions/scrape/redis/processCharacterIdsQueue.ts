/**
 * Thanks to Karbowiak for the original code that this is based on!
 */
import { kv } from "@jitaspace/kv";

import { client } from "../../../client";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";

export type ProcessRedisCharacterIdsQueueEventPayload = {
  data: {};
};

export const processRedisCharacterIds = client.createFunction(
  {
    id: "process-redis-character-ids",
    name: "Process Character IDs from Redis Queue",
    concurrency: {
      limit: 1,
    },
    retries: 0,
  },
  { event: "process/redis/character-ids" },
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
