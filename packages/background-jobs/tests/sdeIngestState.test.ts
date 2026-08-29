import { beforeAll, describe, expect, it, jest } from "@jest/globals";

import type { SdeRecord } from "@jitaspace/sde-utils";

import type {
  coversSdeBuild as CoversSdeBuild,
  loadedSdeBuild as LoadedSdeBuild,
  recordSdeIngestCompleted as RecordSdeIngestCompleted,
  recordSdeIngestStarted as RecordSdeIngestStarted,
  sdeBuildFromMetadata as SdeBuildFromMetadata,
  SdeIngestState,
} from "../jobs/scrape/sde/sdeIngestState";

// @swc/jest doesn't hoist jest.mock, so the Redis stubs are declared first and
// the factory closes over them; the module is imported lazily in beforeAll.
const redisGet = jest.fn<(key: string) => Promise<string | null>>();
const redisSet = jest.fn<(key: string, value: string) => Promise<unknown>>();

jest.mock("../kv", () => ({
  getRedis: () => Promise.resolve({ get: redisGet, set: redisSet }),
}));

let coversSdeBuild: typeof CoversSdeBuild;
let loadedSdeBuild: typeof LoadedSdeBuild;
let recordSdeIngestCompleted: typeof RecordSdeIngestCompleted;
let recordSdeIngestStarted: typeof RecordSdeIngestStarted;
let sdeBuildFromMetadata: typeof SdeBuildFromMetadata;
let SDE_INGEST_STALE_AFTER_MS: number;

beforeAll(async () => {
  ({
    coversSdeBuild,
    loadedSdeBuild,
    recordSdeIngestCompleted,
    recordSdeIngestStarted,
    sdeBuildFromMetadata,
    SDE_INGEST_STALE_AFTER_MS,
  } = await import("../jobs/scrape/sde/sdeIngestState"));
});

const KEY = "sde:ingest";
const BUILD_NUMBER = 3453885;

const metadata = (sde: unknown) => ({ sde }) as unknown as SdeRecord;

/** The value most recently written to Redis, parsed back. */
const lastWritten = () =>
  JSON.parse(String(redisSet.mock.calls.at(-1)?.[1])) as SdeIngestState;

describe("sdeBuildFromMetadata", () => {
  it("reads the build number out of _sde.yaml", () => {
    expect(
      sdeBuildFromMetadata(
        metadata({
          buildNumber: BUILD_NUMBER,
          releaseDate: "2026-07-31T11:29:31Z",
          schemaChangeLog: "https://example.test/changelog",
        }),
      ),
    ).toEqual({
      buildNumber: BUILD_NUMBER,
      releaseDate: "2026-07-31T11:29:31Z",
    });
  });

  it("throws rather than guessing when the build number is unusable", () => {
    // Recording a wrong build would make `watch-sde` skip a real update.
    expect(() => sdeBuildFromMetadata(metadata({}))).toThrow("buildNumber");
    expect(() =>
      sdeBuildFromMetadata(metadata({ buildNumber: "3453885" })),
    ).toThrow("buildNumber");
    // No `sde` key at all — an empty or unexpected `_sde.yaml`.
    expect(() => sdeBuildFromMetadata({})).toThrow("buildNumber");
  });

  it("carries the build's release date, and tolerates its absence", () => {
    expect(
      sdeBuildFromMetadata({
        sde: { buildNumber: 3484357, releaseDate: "2026-08-28T11:07:12Z" },
      }),
    ).toEqual({ buildNumber: 3484357, releaseDate: "2026-08-28T11:07:12Z" });
    // js-yaml reads an unquoted timestamp as a Date; normalise it.
    expect(
      sdeBuildFromMetadata({
        sde: { buildNumber: 1, releaseDate: new Date("2026-08-28T11:07:12Z") },
      }).releaseDate,
    ).toBe("2026-08-28T11:07:12.000Z");
    // Descriptive, not the ingest's identity: a build without one still ingests.
    expect(sdeBuildFromMetadata({ sde: { buildNumber: 1 } }).releaseDate).toBe(
      null,
    );
  });
});

describe("loadedSdeBuild", () => {
  it("returns null when nothing has been ingested", async () => {
    redisGet.mockResolvedValueOnce(null);

    await expect(loadedSdeBuild()).resolves.toBeNull();
    expect(redisGet).toHaveBeenCalledWith(KEY);
  });

  it("parses a stored state", async () => {
    redisGet.mockResolvedValueOnce(
      JSON.stringify({
        buildNumber: BUILD_NUMBER,
        startedAt: 1000,
        completedAt: 2000,
      }),
    );

    await expect(loadedSdeBuild()).resolves.toEqual({
      buildNumber: BUILD_NUMBER,
      // The stored value predates the field, so it reads back as null rather
      // than making the whole state unparseable.
      releaseDate: null,
      startedAt: 1000,
      completedAt: 2000,
    });
  });

  it("treats an unreadable value as nothing ingested", async () => {
    // Re-ingesting is idempotent, so "can't tell" should fall through to a run
    // rather than throw an hourly cron into a crash loop.
    for (const raw of [
      "not json",
      "null",
      JSON.stringify({ startedAt: 1 }),
      JSON.stringify({ buildNumber: "3453885", startedAt: 1 }),
      JSON.stringify({ buildNumber: BUILD_NUMBER }),
    ]) {
      redisGet.mockResolvedValueOnce(raw);
      await expect(loadedSdeBuild()).resolves.toBeNull();
    }
  });

  it("normalises a missing completedAt to null", async () => {
    redisGet.mockResolvedValueOnce(
      JSON.stringify({
        buildNumber: BUILD_NUMBER,
        startedAt: 1,
        completedAt: "x",
      }),
    );

    await expect(loadedSdeBuild()).resolves.toMatchObject({
      completedAt: null,
    });
  });
});

describe("recordSdeIngestStarted", () => {
  it("claims the key and clears any previous completion", async () => {
    redisSet.mockResolvedValue("OK");

    await recordSdeIngestStarted({ buildNumber: BUILD_NUMBER });

    expect(redisSet.mock.calls.at(-1)?.[0]).toBe(KEY);
    // A stale `completedAt` from the previous build must not survive, or the
    // watcher would read this run as already finished.
    expect(lastWritten()).toMatchObject({
      buildNumber: BUILD_NUMBER,
      completedAt: null,
    });
    expect(lastWritten().startedAt).toBeGreaterThan(0);
  });
});

describe("recordSdeIngestCompleted", () => {
  it("stamps the completion of a claim still on the same build", async () => {
    redisGet.mockResolvedValueOnce(
      JSON.stringify({
        buildNumber: BUILD_NUMBER,
        startedAt: 1000,
        completedAt: null,
      }),
    );
    redisSet.mockResolvedValue("OK");

    await recordSdeIngestCompleted(BUILD_NUMBER);

    expect(lastWritten()).toMatchObject({
      buildNumber: BUILD_NUMBER,
      startedAt: 1000,
    });
    expect(lastWritten().completedAt).toBeGreaterThan(0);
  });

  it("leaves a claim for a newer build alone", async () => {
    // A slow run that a newer one has superseded must not stamp the newer claim
    // as complete — that would report the new build as loaded when it isn't.
    redisGet.mockResolvedValueOnce(
      JSON.stringify({
        buildNumber: BUILD_NUMBER + 1,
        startedAt: 1000,
        completedAt: null,
      }),
    );

    await recordSdeIngestCompleted(BUILD_NUMBER);

    expect(redisSet).not.toHaveBeenCalled();
  });

  it("writes nothing when the claim has vanished", async () => {
    redisGet.mockResolvedValueOnce(null);

    await recordSdeIngestCompleted(BUILD_NUMBER);

    expect(redisSet).not.toHaveBeenCalled();
  });
});

describe("coversSdeBuild", () => {
  const state = (over: Partial<SdeIngestState> = {}): SdeIngestState => ({
    buildNumber: BUILD_NUMBER,
    releaseDate: null,
    startedAt: Date.now(),
    completedAt: null,
    ...over,
  });

  it("is false when nothing has been ingested", () => {
    expect(coversSdeBuild(null, BUILD_NUMBER)).toBe(false);
  });

  it("is false for a different build", () => {
    expect(coversSdeBuild(state({ completedAt: Date.now() }), 3453886)).toBe(
      false,
    );
  });

  it("is true for a completed ingest of the same build", () => {
    expect(
      coversSdeBuild(state({ completedAt: Date.now() }), BUILD_NUMBER),
    ).toBe(true);
  });

  it("is true while a claim is younger than the stale window", () => {
    const startedAt = Date.now() - SDE_INGEST_STALE_AFTER_MS / 2;
    expect(coversSdeBuild(state({ startedAt }), BUILD_NUMBER)).toBe(true);
  });

  it("is false once an unfinished claim outlives the stale window", () => {
    const startedAt = Date.now() - SDE_INGEST_STALE_AFTER_MS - 1000;
    expect(coversSdeBuild(state({ startedAt }), BUILD_NUMBER)).toBe(false);
  });
});
