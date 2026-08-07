import { describe, expect, it, jest } from "@jest/globals";

import type { ResponseConfig } from "@jitaspace/esi-client";

import {
  EsiPageCeilingError,
  esiPagedQueryOptions,
} from "../src/hooks/multi/esiPagedQueryOptions";

const page = (data: number[], xPages?: string): ResponseConfig<number[]> =>
  ({
    data,
    headers: xPages == undefined ? {} : { "x-pages": xPages },
  }) as unknown as ResponseConfig<number[]>;

const runQueryFn = async (
  fetchPage: (page: number) => Promise<ResponseConfig<number[]>>,
) => {
  const options = esiPagedQueryOptions({ queryKey: ["test"], fetchPage });
  return options.queryFn();
};

describe("esiPagedQueryOptions", () => {
  it("returns the first page unchanged when there is only one", async () => {
    const fetchPage = jest.fn(() => Promise.resolve(page([1, 2, 3], "1")));

    const result = await runQueryFn(fetchPage);

    expect(result.data).toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("concatenates every page in order", async () => {
    const pages: Record<number, number[]> = { 1: [1, 2], 2: [3, 4], 3: [5] };
    const fetchPage = jest.fn((p: number) =>
      Promise.resolve(page(pages[p] ?? [], "3")),
    );

    const result = await runQueryFn(fetchPage);

    expect(result.data).toEqual([1, 2, 3, 4, 5]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage.mock.calls.map(([p]) => p)).toEqual([1, 2, 3]);
  });

  it("requests the pages after the first concurrently", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchPage = jest.fn(async (p: number) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return page([p], "4");
    });

    await runQueryFn(fetchPage);

    // Page 1 is fetched alone to learn the count; pages 2-4 then overlap, and
    // three is under the pool limit so all three run at once.
    expect(maxInFlight).toBe(3);
  });

  it("caps how many pages are in flight at once", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchPage = jest.fn(async (p: number) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return page([p], "40");
    });

    const result = await runQueryFn(fetchPage);

    // Every page is still fetched, but not all at once: an unbounded fan-out
    // would put 39 requests on the wire simultaneously, per subject.
    expect(fetchPage).toHaveBeenCalledTimes(40);
    expect(result.data).toHaveLength(40);
    expect(maxInFlight).toBeLessThanOrEqual(5);
  });

  it("threads the abort signal into every page", async () => {
    const seen: (AbortSignal | undefined)[] = [];
    const fetchPage = jest.fn((p: number, signal?: AbortSignal) => {
      seen.push(signal);
      return Promise.resolve(page([p], "3"));
    });
    const signal = new AbortController().signal;

    const options = esiPagedQueryOptions({ queryKey: ["test"], fetchPage });
    await options.queryFn({ signal });

    expect(seen).toEqual([signal, signal, signal]);
  });

  it("floors a fractional x-pages instead of throwing", async () => {
    // new Array(2.5) is a RangeError, which would fail the whole query rather
    // than degrade on a malformed header.
    const fetchPage = jest.fn((p: number) => Promise.resolve(page([p], "2.5")));

    const result = await runQueryFn(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual([1, 2]);
  });

  it("refuses rather than truncating when a subject exceeds the page ceiling", async () => {
    const fetchPage = jest.fn((p: number) => Promise.resolve(page([p], "500")));

    // Returning the first 100 pages would look like a complete collection —
    // the same silent-partial failure the cursor-paginated endpoints are
    // skipped for. Only page 1 is fetched, so nothing is spent discovering it.
    await expect(runQueryFn(fetchPage)).rejects.toThrow(EsiPageCeilingError);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("does not retry the ceiling refusal", () => {
    const options = esiPagedQueryOptions({
      queryKey: ["test"],
      fetchPage: () => Promise.resolve(page([], "500")),
    });

    // Deterministic from page 1's headers, so React Query's default of three
    // retries would just re-fetch page 1 to fail the same way each time.
    expect(options.retry(0, new EsiPageCeilingError(500))).toBe(false);
    // Everything else keeps the normal retry behaviour.
    expect(options.retry(0, new Error("network"))).toBe(true);
    expect(options.retry(3, new Error("network"))).toBe(false);
  });

  it("fetches right up to the ceiling", async () => {
    const fetchPage = jest.fn((p: number) => Promise.resolve(page([p], "100")));

    const result = await runQueryFn(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(100);
    expect(result.data).toHaveLength(100);
  });

  it("stops issuing pages once one fails", async () => {
    let issued = 0;
    const fetchPage = jest.fn((p: number) => {
      issued += 1;
      if (p === 2) return Promise.reject(new Error("boom"));
      return Promise.resolve(page([p], "50"));
    });

    const options = esiPagedQueryOptions({ queryKey: ["test"], fetchPage });
    await expect(options.queryFn()).rejects.toThrow("boom");

    // The workers already in flight finish, but no new pages are started —
    // without the guard this walks all 49 remaining pages.
    expect(issued).toBeLessThanOrEqual(6);
  });

  it("treats a missing x-pages header as a single page", async () => {
    const fetchPage = jest.fn(() => Promise.resolve(page([7])));

    const result = await runQueryFn(fetchPage);

    expect(result.data).toEqual([7]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("treats an unparseable x-pages header as a single page", async () => {
    const fetchPage = jest.fn(() => Promise.resolve(page([7], "not-a-number")));

    const result = await runQueryFn(fetchPage);

    expect(result.data).toEqual([7]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
