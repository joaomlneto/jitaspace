import { describe, expect, it, jest } from "@jest/globals";

import {
  createEsiGate,
  lastModifiedOf,
  pagesOf,
} from "../helpers/esiRequestGate";

/** A clock that only moves when the gate sleeps. */
const fakeClock = () => {
  let t = 1_000_000;
  const sleeps: number[] = [];
  return {
    now: () => t,
    sleep: (ms: number) => {
      sleeps.push(ms);
      t += ms;
      return Promise.resolve();
    },
    sleeps,
  };
};

const ok = (headers: Record<string, string> = {}, status = 200) =>
  Promise.resolve({ data: ["row"], status, headers });

const httpError = (status: number, headers: Record<string, string> = {}) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, headers } });

describe("createEsiGate", () => {
  it("returns successful responses", async () => {
    const clock = fakeClock();
    const gate = createEsiGate({ concurrency: 2, ...clock });
    await expect(gate.request(() => ok({ "x-pages": "3" }))).resolves.toEqual({
      ok: true,
      status: 200,
      data: ["row"],
      headers: { "x-pages": "3" },
    });
    expect(gate.stats.statuses).toEqual({ 200: 1 });
  });

  it("never retries a 403 or 404", async () => {
    const clock = fakeClock();
    const gate = createEsiGate({ concurrency: 1, ...clock });
    for (const status of [400, 403, 404]) {
      const call = jest.fn(() => Promise.reject(httpError(status)));
      const res = await gate.request(call);
      expect(res).toMatchObject({ ok: false, status, transient: false });
      expect(call).toHaveBeenCalledTimes(1);
    }
    expect(clock.sleeps).toEqual([]);
  });

  it("retries 5xx and dropped connections with backoff, then reports them as transient", async () => {
    const clock = fakeClock();
    const gate = createEsiGate({ concurrency: 1, maxAttempts: 3, ...clock });
    const call = jest.fn(() => Promise.reject(httpError(503)));
    await expect(gate.request(call)).resolves.toMatchObject({
      ok: false,
      status: 503,
      transient: true,
    });
    expect(call).toHaveBeenCalledTimes(3);
    expect(clock.sleeps).toEqual([2000, 4000]);

    const dropped = jest
      .fn<
        () => Promise<{
          data: string[];
          status: number;
          headers: Record<string, string>;
        }>
      >()
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockImplementation(() => ok());
    await expect(gate.request(dropped)).resolves.toMatchObject({ ok: true });
    expect(dropped).toHaveBeenCalledTimes(2);
  });

  it("pauses every request once the error budget runs low", async () => {
    const clock = fakeClock();
    const gate = createEsiGate({ concurrency: 1, errorFloor: 20, ...clock });
    await gate.request(() =>
      Promise.reject(
        httpError(403, {
          "x-esi-error-limit-remain": "20",
          "x-esi-error-limit-reset": "41",
        }),
      ),
    );
    // The next request, even a successful one, waits for the window to reset.
    await gate.request(() => ok());
    expect(clock.sleeps).toEqual([42_000]);
    expect(gate.stats.errorPauses).toBe(1);
  });

  it("does not pause while the budget is healthy", async () => {
    const clock = fakeClock();
    const gate = createEsiGate({ concurrency: 1, ...clock });
    await gate.request(() =>
      ok({ "x-esi-error-limit-remain": "95", "x-esi-error-limit-reset": "30" }),
    );
    await gate.request(() => ok());
    expect(clock.sleeps).toEqual([]);
  });

  it("waits out a 420 and retries", async () => {
    const clock = fakeClock();
    const gate = createEsiGate({ concurrency: 1, ...clock });
    const call = jest
      .fn<
        () => Promise<{
          data: string[];
          status: number;
          headers: Record<string, string>;
        }>
      >()
      .mockRejectedValueOnce(
        httpError(420, {
          "x-esi-error-limit-remain": "0",
          "x-esi-error-limit-reset": "17",
        }),
      )
      .mockImplementation(() => ok());
    await expect(gate.request(call)).resolves.toMatchObject({ ok: true });
    expect(clock.sleeps).toEqual([18_000]);
  });

  it("honours Retry-After on a 429", async () => {
    const clock = fakeClock();
    const gate = createEsiGate({ concurrency: 1, ...clock });
    const call = jest
      .fn<
        () => Promise<{
          data: string[];
          status: number;
          headers: Record<string, string>;
        }>
      >()
      .mockRejectedValueOnce(httpError(429, { "retry-after": "7" }))
      .mockImplementation(() => ok());
    await expect(gate.request(call)).resolves.toMatchObject({ ok: true });
    expect(clock.sleeps).toEqual([7000]);
  });

  it("limits concurrency", async () => {
    const gate = createEsiGate({ concurrency: 2 });
    let active = 0;
    let peak = 0;
    const call = async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return { data: [], status: 200, headers: {} };
    };
    await Promise.all(Array.from({ length: 6 }, () => gate.request(call)));
    expect(peak).toBe(2);
  });
});

describe("header helpers", () => {
  it("reads X-Pages, defaulting to one page", () => {
    expect(pagesOf({ "x-pages": "35" })).toBe(35);
    expect(pagesOf({})).toBe(1);
  });

  it("reads Last-Modified as epoch ms", () => {
    expect(
      lastModifiedOf({ "last-modified": "Tue, 03 Nov 2026 21:08:12 GMT" }),
    ).toBe(Date.UTC(2026, 10, 3, 21, 8, 12));
    expect(lastModifiedOf({})).toBeUndefined();
  });
});
