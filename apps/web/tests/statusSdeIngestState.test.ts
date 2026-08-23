import * as fs from "node:fs";
import * as path from "node:path";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// `getSdeIngestState` reads the marker the `ingest-sde-all` pipeline writes to
// Redis, so the status page can compare the build our database holds against
// CCP's latest. Stub the surrounding modules — the action only touches Redis.

const redisGet = jest.fn<(key: string) => Promise<string | null>>();

jest.mock("~/lib/kv", () => ({ redis: { get: (k: string) => redisGet(k) } }));
jest.mock("~/lib/db", () => ({ prisma: {} }));
jest.mock("~/env", () => ({ env: {} }));

const actions =
  require("~/app/status/actions") as typeof import("~/app/status/actions");
const { SDE_INGEST_KEY } =
  require("~/app/status/types") as typeof import("~/app/status/types");

beforeEach(() => {
  redisGet.mockReset();
});

describe("SDE_INGEST_KEY", () => {
  // The web app can't import @jitaspace/background-jobs (it pulls in Bull and
  // the Trigger.dev SDK), so the key is duplicated. It silently drifted once
  // already when the background job switched markers; read the source of truth
  // off disk so a rename there fails here instead of quietly returning null.
  it("matches the key the background job writes", () => {
    const source = fs.readFileSync(
      path.join(
        __dirname,
        "../../../packages/background-jobs/jobs/scrape/sde/sdeIngestState.ts",
      ),
      "utf8",
    );
    const match = /const SDE_INGEST_KEY = "([^"]+)"/.exec(source);
    expect(match?.[1]).toBe(SDE_INGEST_KEY);
  });
});

describe("getSdeIngestState", () => {
  it("returns the ingested build and its completion time", async () => {
    const completedAt = Date.UTC(2026, 4, 27, 12, 0, 0);
    redisGet.mockResolvedValue(
      JSON.stringify({ buildNumber: 3383521, startedAt: 1, completedAt }),
    );

    await expect(actions.getSdeIngestState()).resolves.toEqual({
      buildNumber: 3383521,
      completedAt: new Date(completedAt).toISOString(),
    });
    expect(redisGet).toHaveBeenCalledWith("sde:ingest");
  });

  it("reports a null completion while an ingest is in flight", async () => {
    redisGet.mockResolvedValue(
      JSON.stringify({ buildNumber: 3383521, startedAt: 1, completedAt: null }),
    );

    await expect(actions.getSdeIngestState()).resolves.toEqual({
      buildNumber: 3383521,
      completedAt: null,
    });
  });

  it("returns null before anything has been ingested", async () => {
    redisGet.mockResolvedValue(null);
    await expect(actions.getSdeIngestState()).resolves.toBeNull();
  });

  it("returns null for a marker with no usable build number", async () => {
    redisGet.mockResolvedValue(JSON.stringify({ startedAt: 1 }));
    await expect(actions.getSdeIngestState()).resolves.toBeNull();
  });

  it("returns null for an unparseable marker", async () => {
    redisGet.mockResolvedValue("not json");
    await expect(actions.getSdeIngestState()).resolves.toBeNull();
  });

  it("returns null when Redis is unreachable", async () => {
    // The status page degrades to a dash rather than failing to render.
    redisGet.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(actions.getSdeIngestState()).resolves.toBeNull();
  });
});
