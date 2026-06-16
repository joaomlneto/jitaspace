import Queue from "bull";
import { createClient } from "redis";

export interface CreateKvOptions {
  /** Redis connection URL. */
  redisUrl: string;
}

/**
 * Create the Redis client and Bull queues.
 *
 * This package reads no environment variables: callers (apps) inject the Redis
 * URL from their own validated env. The Redis client is connected eagerly, so
 * this is async — callers typically `await` it once and re-export the result.
 */
export async function createKv({ redisUrl }: CreateKvOptions) {
  const redis = await createClient({ url: redisUrl }).connect();

  const kv = {
    queues: {
      allianceIds: new Queue<{ allianceIds: number[] }>("allianceIds", redisUrl),
      characterIds: new Queue<{ characterIds: number[] }>(
        "characterIds",
        redisUrl,
      ),
      corporationIds: new Queue<{ corporationIds: number[] }>(
        "corporationIds",
        redisUrl,
      ),
      // Payload type is intentionally `unknown`: kv is a generic Redis/queue
      // wrapper with no knowledge of EVE domain shapes. Consumers assert the
      // concrete element type at their call site (e.g. the wars drain handler
      // in @jitaspace/background-jobs).
      war: new Queue<unknown>("wars", redisUrl),
    },
  };

  return { redis, kv };
}

export type Kv = Awaited<ReturnType<typeof createKv>>;
