import { createRemoteCacheHandler } from "@mrjasonroy/cache-components-cache-handler";

import { cacheOptions } from "./options.mjs";

/**
 * `"use cache: remote"`. Nothing uses it yet; it is defined so that it could
 * never fall back to `REDIS_URL` (see `options.mjs`).
 */
export default createRemoteCacheHandler(cacheOptions);
