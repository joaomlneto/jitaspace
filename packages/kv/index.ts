import Queue from "bull";
import { createClient } from "redis";

import { GetWarsWarId200 } from "@jitaspace/esi-client";

export const redis = await createClient({
  url: process.env.REDIS_URL,
}).connect();

const keys = {
  killmails: "killmails",
  wars: "wars",
};

export const kv = {
  queues: {
    allianceIds: new Queue<{ allianceIds: number[] }>(
      "allianceIds",
      process.env.REDIS_URL as string,
    ),
    characterIds: new Queue<{ characterIds: number[] }>(
      "characterIds",
      process.env.REDIS_URL as string,
    ),
    corporationIds: new Queue<{ corporationIds: number[] }>(
      "corporationIds",
      process.env.REDIS_URL as string,
    ),
    war: new Queue<GetWarsWarId200[]>("wars", process.env.REDIS_URL as string),
  },
};
