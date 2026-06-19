import { beforeAll, describe, expect, it, jest } from "@jest/globals";

import type { watchSde as WatchSde } from "../jobs/scrape/sde/watchSde";

// @swc/jest doesn't hoist jest.mock, so these mock fns are declared first and the
// factories close over them; the job is imported lazily in beforeAll (after the
// mocks register). The real @jitaspace/sde-utils barrel also won't resolve under
// jest, so it must be mocked regardless.
const latestSdeLastModified = jest.fn<() => Promise<Date>>();
const redisGet = jest.fn<(key: string) => Promise<string | null>>();
const redisSet = jest.fn<(key: string, value: string) => Promise<unknown>>();

jest.mock("@jitaspace/sde-utils", () => ({ latestSdeLastModified }));
jest.mock("../kv", () => ({
  getRedis: () => Promise.resolve({ get: redisGet, set: redisSet }),
}));

let watchSde: typeof WatchSde;

beforeAll(async () => {
  ({ watchSde } = await import("../jobs/scrape/sde/watchSde"));
});

const STORE_KEY = "sde:last-modified-ingested";
const MODIFIED = new Date("2026-06-19T11:05:00Z");
const MODIFIED_ISO = MODIFIED.toISOString();

const run = (seen: string | null) => {
  latestSdeLastModified.mockResolvedValue(MODIFIED);
  redisGet.mockResolvedValue(seen);
  redisSet.mockResolvedValue("OK");
  const send = jest.fn<(id: string, payload: unknown) => Promise<void>>(() =>
    Promise.resolve(),
  );
  const ctx = {
    payload: {},
    attempt: 1,
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    send,
    invoke: jest.fn(),
    run: jest.fn(),
    sleep: jest.fn(),
  } as unknown as Parameters<typeof watchSde.handler>[0];
  return { result: watchSde.handler(ctx), send };
};

describe("watch-sde", () => {
  it("triggers ingest-sde-all and records the timestamp when the SDE changed", async () => {
    const { result, send } = run(null); // never seen
    await expect(result).resolves.toMatchObject({
      changed: true,
      lastModified: MODIFIED_ISO,
    });
    expect(send).toHaveBeenCalledWith("ingest-sde-all", {});
    expect(redisSet).toHaveBeenCalledWith(STORE_KEY, MODIFIED_ISO);
  });

  it("does nothing when the stored timestamp already matches", async () => {
    const { result, send } = run(MODIFIED_ISO); // already ingested this version
    await expect(result).resolves.toMatchObject({ changed: false });
    expect(send).not.toHaveBeenCalled();
    expect(redisSet).not.toHaveBeenCalled();
  });
});
