import { eventType, staticSchema } from "inngest";

import { kv } from "@jitaspace/kv";

import { client } from "../../../client";
import { createCorpAndItsRefRecords } from "../../../helpers/createCorpAndItsRefs.ts";

export type ProcessRedisCorporationIdsQueueEventPayload = {
  data: {};
};

export const processRedisCorporationIdsEvent = eventType(
  "process/redis/corporation-ids",
  {
    schema: staticSchema<ProcessRedisCorporationIdsQueueEventPayload["data"]>(),
  },
);

export const processRedisCorporationIds = client.createFunction(
  {
    id: "process-redis-corporation-ids",
    triggers: [processRedisCorporationIdsEvent],
    name: "Process Corporation IDs from Redis Queue",
    concurrency: {
      limit: 1,
    },
    retries: 0,
  },
  async ({ event, step, logger }) => {
    console.log("Processing corporation IDs from Redis queue...");

    await kv.queues.corporationIds.process(async (job, done) => {
      console.log("Processing job:", job.id);
      const corporationIds = job.data.corporationIds;

      await createCorpAndItsRefRecords({
        missingCorporationIds: new Set(corporationIds),
      });

      done();
    });

    return "Finished?";
  },
);
