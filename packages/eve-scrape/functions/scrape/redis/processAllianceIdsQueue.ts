import { kv } from "@jitaspace/kv";

import { client } from "../../../client";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";

export type ProcessRedisAllianceIdsQueueEventPayload = {
  data: {};
};

export const processRedisAllianceIds = client.createFunction(
  {
    id: "process-redis-alliance-ids",
    name: "Process Alliance IDs from Redis Queue",
    concurrency: {
      limit: 1,
    },
    retries: 0,
  },
  { event: "process/redis/alliance-ids" },
  async ({ event, step, logger }) => {
    console.log("Processing alliance IDs from Redis queue...");

    await kv.queues.allianceIds.process(async (job, done) => {
      console.log("Processing job:", job.id);
      const allianceIds = job.data.allianceIds;

      await createCorpAndItsRefRecords({
        missingAllianceIds: new Set(allianceIds),
      });

      done();
    });

    return "Finished?";
  },
);
