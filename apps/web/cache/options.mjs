import process from "node:process";

/**
 * Connection settings shared by the three cache handler files, so they use one
 * connection and one record of which tags were revalidated.
 *
 * `NEXT_CACHE_REDIS_URL` is a Redis of the cache's own, not `REDIS_URL`: the
 * cache needs a memory limit with eviction, and `REDIS_URL` holds application
 * data that must never be evicted. The URL is passed explicitly because a
 * handler given none falls back to `REDIS_URL`.
 *
 * Read from `process.env`, not `~/env`: Next loads these files by path, outside
 * the application bundle, where that alias does not resolve.
 */
export const cacheOptions = {
  // eslint-disable-next-line no-restricted-properties
  url: process.env.NEXT_CACHE_REDIS_URL,
};
