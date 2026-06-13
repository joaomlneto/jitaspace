import { createKv } from "@jitaspace/kv";

import { env } from "./env";

/**
 * Per-package Redis/queues singleton.
 *
 * `@jitaspace/kv` reads no environment variables; we build the client and queues
 * here from this package's validated env. We re-export everything from
 * `@jitaspace/kv` so callers get the client, queues and types from one module
 * (`import { kv, redis } from "../../../kv"`).
 */
export const { redis, kv } = await createKv({ redisUrl: env.REDIS_URL });

export * from "@jitaspace/kv";
