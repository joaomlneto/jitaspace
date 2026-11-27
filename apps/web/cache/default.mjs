import { createLocalCacheHandler } from "@mrjasonroy/cache-components-cache-handler";

import { cacheOptions } from "./options.mjs";

/**
 * `"use cache"`: values stay in each server's memory, and only the record of
 * revalidated tags is shared, so a revalidation on one server reaches all.
 */
export default createLocalCacheHandler(cacheOptions);
