import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type * as RefResolution from "../helpers/refResolution";

// The module imports the ESI client; only postUniverseNames is used, by esiNameOf.
jest.mock("@jitaspace/esi-client", () => ({ postUniverseNames: jest.fn() }));

let refResolution: typeof RefResolution;

beforeEach(async () => {
  jest.useFakeTimers();
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  refResolution = await import("../helpers/refResolution");
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** An axios-shaped HTTP error, as the ESI client throws. */
const httpError = (status: number, headers: Record<string, string> = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, headers },
  });

describe("withEsiRetry", () => {
  it("returns the call's result", async () => {
    await expect(
      refResolution.withEsiRetry("ok", () => Promise.resolve(42)),
    ).resolves.toBe(42);
  });

  it("returns NOT_FOUND on a 404 without retrying", async () => {
    const call = jest.fn(() => Promise.reject(httpError(404)));
    await expect(refResolution.withEsiRetry("gone", call)).resolves.toBe(
      refResolution.NOT_FOUND,
    );
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("retries transient errors instead of reporting the entity missing", async () => {
    // Placeholders used to be written for these: a live entity stored as blank.
    let calls = 0;
    const call = () =>
      ++calls < 3 ? Promise.reject(httpError(504)) : Promise.resolve("live");
    const result = refResolution.withEsiRetry("flaky", call);
    await jest.runAllTimersAsync();
    await expect(result).resolves.toBe("live");
    expect(calls).toBe(3);
  });

  it("waits out ESI's error window on a 420", async () => {
    let calls = 0;
    const call = () =>
      ++calls === 1
        ? Promise.reject(httpError(420, { "x-esi-error-limit-reset": "30" }))
        : Promise.resolve("ok");
    const result = refResolution.withEsiRetry("limited", call);
    await jest.advanceTimersByTimeAsync(30_000);
    expect(calls).toBe(1);
    await jest.advanceTimersByTimeAsync(1_000);
    await expect(result).resolves.toBe("ok");
  });

  it("rides out EVE's daily downtime instead of giving up after a few attempts", async () => {
    // ESI answers 502/503/504 for ~15–30 minutes at 11:00 UTC; a fixed 8 attempts
    // gave up after ~4 minutes and crashed the contracts backfill (2026-10-15).
    const recoversAt = Date.now() + 30 * 60 * 1000;
    let calls = 0;
    const call = () => {
      calls++;
      return Date.now() < recoversAt
        ? Promise.reject(httpError(502))
        : Promise.resolve("back");
    };
    const result = refResolution.withEsiRetry("downtime", call);
    await jest.advanceTimersByTimeAsync(35 * 60 * 1000);
    await expect(result).resolves.toBe("back");
    expect(calls).toBeGreaterThan(8);
  });

  it("rethrows a 400, which retrying cannot fix", async () => {
    await expect(
      refResolution.withEsiRetry("bad", () => Promise.reject(httpError(400))),
    ).rejects.toThrow("400");
  });

  it("fails loudly once retries run out, rather than storing a marker", async () => {
    const result = refResolution.withEsiRetry("down", () =>
      Promise.reject(httpError(503)),
    );
    const assertion = expect(result).rejects.toThrow("503");
    await jest.runAllTimersAsync();
    await assertion;
  });
});

describe("fetchEveKill", () => {
  it("skips eve-kill for a while once it is unreachable, instead of retrying per lookup", async () => {
    // During an eve-kill outage (2026-10-17) every deleted character cost ~4 minutes.
    jest.resetModules();
    const fresh = await import("../helpers/refResolution");
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("connect timeout"));
    const first = fresh.fetchEveKill("characters/1");
    await jest.runAllTimersAsync();
    await expect(first).resolves.toBeNull();
    const attempts = fetchMock.mock.calls.length;
    expect(attempts).toBe(8);

    await expect(fresh.fetchEveKill("characters/2")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(attempts);

    jest.advanceTimersByTime(15 * 60 * 1000);
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await expect(fresh.fetchEveKill("characters/3")).resolves.toEqual({});
  });
});

describe("eveKillBirthday", () => {
  it("keeps dates from 2003 on", () => {
    expect(refResolution.eveKillBirthday("2023-12-08T19:00:07.000Z")).toEqual(
      new Date("2023-12-08T19:00:07.000Z"),
    );
  });

  it("recovers epoch seconds stored as milliseconds", () => {
    // Character 90000001: eve-kill says 1970-01-15T21:58:17.640Z; ESI says 2010-11-02T11:34:00Z.
    expect(refResolution.eveKillBirthday("1970-01-15T21:58:17.640Z")).toEqual(
      new Date("2010-11-02T11:34:00.000Z"),
    );
  });

  it("treats eve-kill's epoch zero and implausible dates as unknown", () => {
    expect(
      refResolution.eveKillBirthday("1970-01-01T00:00:00.000Z"),
    ).toBeNull();
    expect(
      refResolution.eveKillBirthday("1969-12-31T23:00:00.000Z"),
    ).toBeNull();
    expect(refResolution.eveKillBirthday(null)).toBeNull();
  });
});
