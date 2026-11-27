import { createPageCacheHandler } from "@mrjasonroy/cache-components-cache-handler";

import { cacheOptions } from "./options.mjs";

/** Rendered pages (ISR), route handler responses and cached `fetch`. */
export default createPageCacheHandler(cacheOptions);
