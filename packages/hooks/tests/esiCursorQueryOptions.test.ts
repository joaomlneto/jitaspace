import { describe, expect, it, jest } from "@jest/globals";

import type { EsiCursor, ResponseConfig } from "@jitaspace/esi-client";
import { EsiCursorCeilingError } from "@jitaspace/esi-client";

import { esiCursorQueryOptions } from "../src/hooks/multi/esiCursorQueryOptions";
import { ESI_QUERY_KEY_MARKER } from "../src/hooks/utils/esiQueryKeys";

interface Page {
  cursor?: EsiCursor;
  records: number[];
}

const page = (records: number[], before?: string): ResponseConfig<Page> =>
  ({
    data: { records, cursor: before ? { before } : undefined },
    headers: {},
  }) as unknown as ResponseConfig<Page>;

describe("esiCursorQueryOptions", () => {
  it("keeps the whole walk out of the single-page cache entry", () => {
    const options = esiCursorQueryOptions({
      queryKey: [{ url: "/x" }],
      fetchPage: () => Promise.resolve(page([])),
      itemsOf: (p: Page) => p.records,
    });

    expect(options.queryKey).toEqual([
      { url: "/x" },
      ESI_QUERY_KEY_MARKER.allPages,
    ]);
  });

  it("walks every page, threading the query's abort signal into each", async () => {
    const pages: Record<string, ResponseConfig<Page>> = {
      first: page([1, 2], "a"),
      a: page([3], "b"),
      b: page([]),
    };
    const fetchPage = jest.fn(
      (before: string | undefined, _signal?: AbortSignal) =>
        Promise.resolve(pages[before ?? "first"] ?? page([])),
    );
    const signal = new AbortController().signal;

    const result = await esiCursorQueryOptions({
      queryKey: ["x"],
      fetchPage,
      itemsOf: (p) => p.records,
    }).queryFn({ signal });

    expect(result.data).toEqual([1, 2, 3]);
    expect(fetchPage.mock.calls).toEqual([
      [undefined, signal],
      ["a", signal],
      ["b", signal],
    ]);
  });

  it("does not retry the ceiling refusal, but retries what the ESI policy does", () => {
    const { retry } = esiCursorQueryOptions({
      queryKey: ["x"],
      fetchPage: () => Promise.resolve(page([])),
      itemsOf: (p: Page) => p.records,
    });

    expect(retry(0, new EsiCursorCeilingError())).toBe(false);
    expect(retry(0, new Error("Network Error"))).toBe(true);
    expect(
      retry(0, Object.assign(new Error("404"), { response: { status: 404 } })),
    ).toBe(false);
  });
});
