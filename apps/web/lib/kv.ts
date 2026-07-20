import { createKv } from "@jitaspace/kv";

import { env } from "~/env";

/**
 * App-level Redis/queues singleton.
 *
 * `@jitaspace/kv` reads no environment variables; we build the client and queues
 * here from the web app's validated env. We re-export everything from
 * `@jitaspace/kv` so callers get the client, queues and types from one module.
 *
 * Note: this module connects to Redis at load time (top-level await), so import
 * it dynamically where you must defer the connection (see app/debug/page.tsx).
 */
export const { redis, kv } = await createKv({ redisUrl: env.REDIS_URL });

export * from "@jitaspace/kv";
