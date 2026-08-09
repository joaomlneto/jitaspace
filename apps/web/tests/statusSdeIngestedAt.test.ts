import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// `getSdeIngestedAt` reads the marker the `watch-sde` background job writes to
// Redis after each successful SDE ingest, so the status page can compare our
// data against CCP's latest release. Stub the surrounding modules — the action
// only touches Redis.

const redisGet = jest.fn<(key: string) => Promise<string | null>>();

jest.mock("~/lib/kv", () => ({ redis: { get: (k: string) => redisGet(k) } }));
jest.mock("~/lib/db", () => ({ prisma: {} }));
jest.mock("~/env", () => ({ env: {} }));

const actions =
  require("~/app/status/actions") as typeof import("~/app/status/actions");

beforeEach(() => {
  redisGet.mockReset();
});

describe("getSdeIngestedAt", () => {
  it("returns the Last-Modified of the ingested SDE release", async () => {
    redisGet.mockResolvedValue("2026-05-27T00:00:00.000Z");

    await expect(actions.getSdeIngestedAt()).resolves.toBe(
      "2026-05-27T00:00:00.000Z",
    );
    // Must match LAST_SEEN_KEY in @jitaspace/background-jobs' watchSde.
    expect(redisGet).toHaveBeenCalledWith("sde:last-modified-ingested");
  });

  it("returns null before anything has been ingested", async () => {
    redisGet.mockResolvedValue(null);
    await expect(actions.getSdeIngestedAt()).resolves.toBeNull();
  });

  it("returns null when Redis is unreachable", async () => {
    // The status page degrades to an em dash rather than failing to render.
    redisGet.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(actions.getSdeIngestedAt()).resolves.toBeNull();
  });
});
