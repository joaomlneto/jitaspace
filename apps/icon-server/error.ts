import { send, setResponseHeaders, setResponseStatus } from "h3";
import { defineNitroErrorHandler } from "nitropack/runtime";

import { NOT_FOUND_CACHE_CONTROL } from "./lib/serve";

/**
 * Nitro error handler: Nitro's default JSON error response, with our own
 * `Cache-Control` (the default forces `no-cache` on every 404).
 *
 *   - 404 / 400 — the icon/type doesn't exist (or the ID is malformed): cache
 *     for hours, so repeated misses don't re-hit the database.
 *   - anything else (5xx: database/upstream failures, …): `no-store`, so a
 *     transient outage is never pinned in a cache.
 */
export default defineNitroErrorHandler(
  async (error, event, { defaultHandler }) => {
    const res = await defaultHandler(error, event);
    const cacheable = res.status === 404 || res.status === 400;
    setResponseHeaders(event, {
      ...res.headers,
      "cache-control": cacheable ? NOT_FOUND_CACHE_CONTROL : "no-store",
    });
    setResponseStatus(event, res.status, res.statusText);
    // The dev handler renders an HTML page (a string) for browsers; only
    // serialise object bodies.
    return send(
      event,
      typeof res.body === "string"
        ? res.body
        : JSON.stringify(res.body, null, 2),
    );
  },
);
