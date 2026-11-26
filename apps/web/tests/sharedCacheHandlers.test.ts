/* eslint-disable no-restricted-properties --
   The handler files read `process.env` themselves (they load outside the app
   bundle, where `~/env` does not resolve), so the test has to set it. */
import { afterEach, describe, expect, it } from "@jest/globals";

/**
 * The cache handler files Next loads by path (`apps/web/cache/*.mjs`). Each
 * must hand the package the cache's own Redis URL: a handler given none falls
 * back to `REDIS_URL`, which holds application data.
 */
jest.mock("@mrjasonroy/cache-components-cache-handler", () => ({
  __esModule: true,
  createPageCacheHandler: (options: unknown) => ({ kind: "page", options }),
  createLocalCacheHandler: (options: unknown) => ({ kind: "local", options }),
  createRemoteCacheHandler: (options: unknown) => ({ kind: "remote", options }),
}));

interface HandlerModule {
  default: { kind: string; options: { url?: string } };
}

const CACHE_URL = "redis://cache.internal:6379";
const ORIGINAL_CACHE_URL = process.env.NEXT_CACHE_REDIS_URL;
const ORIGINAL_REDIS_URL = process.env.REDIS_URL;

function loadHandlers(): Record<"page" | "local" | "remote", HandlerModule> {
  let handlers: Record<"page" | "local" | "remote", HandlerModule> | undefined;
  jest.isolateModules(() => {
    handlers = {
      page: require("../cache/page.mjs") as HandlerModule,
      local: require("../cache/default.mjs") as HandlerModule,
      remote: require("../cache/remote.mjs") as HandlerModule,
    };
  });
  if (!handlers) throw new Error("handlers did not load");
  return handlers;
}

describe("shared cache handler files", () => {
  afterEach(() => {
    process.env.NEXT_CACHE_REDIS_URL = ORIGINAL_CACHE_URL;
    process.env.REDIS_URL = ORIGINAL_REDIS_URL;
  });

  it("gives each handler the cache's own Redis, never the application's", () => {
    process.env.NEXT_CACHE_REDIS_URL = CACHE_URL;
    process.env.REDIS_URL = "redis://app-data.internal:6379";

    const handlers = loadHandlers();

    expect(handlers.page.default).toEqual({
      kind: "page",
      options: { url: CACHE_URL },
    });
    expect(handlers.local.default).toEqual({
      kind: "local",
      options: { url: CACHE_URL },
    });
    expect(handlers.remote.default).toEqual({
      kind: "remote",
      options: { url: CACHE_URL },
    });
  });

  it("shares one options object, so the handlers share one connection", () => {
    process.env.NEXT_CACHE_REDIS_URL = CACHE_URL;

    const handlers = loadHandlers();

    expect(handlers.local.default.options).toBe(handlers.page.default.options);
    expect(handlers.remote.default.options).toBe(handlers.page.default.options);
  });
});
