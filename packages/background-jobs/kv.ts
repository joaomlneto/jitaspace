import type { Kv } from "@jitaspace/kv";
import { createKv } from "@jitaspace/kv";

import { env } from "./env";

/**
 * Lazy per-package Redis/queues singleton.
 *
 * `@jitaspace/kv` reads no environment variables; we build the client and
 * queues from this package's validated env. Unlike a top-level
 * `await createKv()`, connection is deferred until a job first needs it: the
 * Trigger.dev build imports every task module to index it, and an eager connect
 * would try to reach Redis at deploy/index time (and on every cold start).
 * Only the Bull queue + zKillboard-cursor jobs call `getKv`/`getRedis`.
 */
let kvPromise: Promise<Kv> | undefined;

export const getKv = (): Promise<Kv> => {
  kvPromise ??= createKv({ redisUrl: env.REDIS_URL });
  return kvPromise;
};

export const getRedis = async () => (await getKv()).redis;

export * from "@jitaspace/kv";
