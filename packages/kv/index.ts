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
    war: new Queue<GetWarsWarId200[]>("wars", process.env.REDIS_URL as string),
  },
};
