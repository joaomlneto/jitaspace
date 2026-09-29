/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as SdeCacheModule from "../lib/sdeCache";

const mockRevalidateTag = jest.fn();
const mockCacheTag = jest.fn();
const mockCacheLife = jest.fn();

jest.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
  cacheTag: (...args: unknown[]) => mockCacheTag(...args),
  cacheLife: (...args: unknown[]) => mockCacheLife(...args),
}));

// Mutable so each test can pick the secret the deployment runs with, including
// none at all (`SKIP_ENV_VALIDATION` lets a build start without one).
const mockEnv: { CRON_SECRET?: string } = {};
jest.mock("~/env", () => ({ env: mockEnv }));

const SECRET = "0123456789abcdef-test-secret";

// Loaded lazily, after the mocks above are registered: @swc/jest does not hoist
// jest.mock above a top-level import.
const loadPOST = () =>
  (
    require("../app/api/revalidate/sde/route") as {
      POST: (request: Request) => Response;
    }
  ).POST;

const post = (authorization?: string) =>
  loadPOST()(
    new Request("https://www.jita.space/api/revalidate/sde", {
      method: "POST",
      headers: authorization ? { authorization } : {},
    }),
  );

beforeEach(() => {
  mockRevalidateTag.mockReset();
  mockCacheTag.mockReset();
  mockCacheLife.mockReset();
  mockEnv.CRON_SECRET = SECRET;
});

describe("POST /api/revalidate/sde", () => {
  it("revalidates the sde tag, stale-while-revalidate, for the right secret", async () => {
    const res = post(`Bearer ${SECRET}`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: "sde" });
    // "max" rather than no profile: a missing profile expires the tag outright,
    // so the next visitor to each page waits on the database (or gets an error
    // page if it is down) instead of being served the old copy.
    expect(mockRevalidateTag).toHaveBeenCalledTimes(1);
    expect(mockRevalidateTag).toHaveBeenCalledWith("sde", "max");
  });

  it.each([
    ["no Authorization header", undefined],
    ["the wrong secret", "Bearer not-the-secret-at-all"],
    ["the secret without the Bearer scheme", SECRET],
    [
      "a secret that is a prefix of the real one",
      `Bearer ${SECRET.slice(0, -1)}`,
    ],
  ])("rejects %s without revalidating", async (_label, authorization) => {
    const res = post(authorization);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("authorizes nothing when the deployment has no secret", () => {
    delete mockEnv.CRON_SECRET;

    // Without the guard, an unset secret would make the expected header the
    // literal string "Bearer undefined".
    expect(post("Bearer undefined").status).toBe(401);
    expect(post("Bearer ").status).toBe(401);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("authorizes nothing when the secret is too short to be one", () => {
    mockEnv.CRON_SECRET = "short";

    expect(post("Bearer short").status).toBe(401);
    expect(mockRevalidateTag).not.toHaveBeenCalled();
  });

  it("only answers POST", () => {
    const route = require("../app/api/revalidate/sde/route") as Record<
      string,
      unknown
    >;

    // A GET that purged the cache could be fired by a crawler or a link
    // prefetch; Next answers every method the module does not export with 405.
    expect(Object.keys(route)).toEqual(["POST"]);
  });
});

describe("cacheSdeRead", () => {
  it("tags the entry sde and keeps it for the longest profile", () => {
    const { cacheSdeRead, SDE_CACHE_TAG } =
      require("../lib/sdeCache") as typeof SdeCacheModule;

    cacheSdeRead();

    // The tag must be the one the route revalidates, or an ingest purges nothing.
    expect(SDE_CACHE_TAG).toBe("sde");
    expect(mockCacheTag).toHaveBeenCalledWith(SDE_CACHE_TAG);
    expect(mockCacheLife).toHaveBeenCalledWith("max");
  });
});
