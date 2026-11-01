import { describe, expect, it, jest } from "@jest/globals";

import type { ResponseConfig } from "@jitaspace/esi-client";

import type * as CursorModule from "../src/hooks/utils/esiCursorQueryOptions";
import type * as QueryKeysModule from "../src/hooks/utils/esiQueryKeys";

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  // The app-wide policy; stubbed so the ceiling's own veto is what is tested.
  shouldRetryEsiRequest: (failureCount: number) => failureCount < 3,
}));

const { ESI_CURSOR_PAGE_SIZE, EsiCursorCeilingError, esiCursorQueryOptions } =
  require("../src/hooks/utils/esiCursorQueryOptions") as typeof CursorModule;
const { ESI_QUERY_KEY_MARKER } =
  require("../src/hooks/utils/esiQueryKeys") as typeof QueryKeysModule;

interface Page {
  cursor?: { before?: string; after?: string };
  rows: number[];
}

const full = (start: number) =>
  Array.from({ length: ESI_CURSOR_PAGE_SIZE }, (_, i) => start + i);

const respond = (page: Page) =>
  Promise.resolve({ data: page, headers: {} } as ResponseConfig<Page>);

/** A fake endpoint serving `pages` in order, keyed by the cursor that asks for each. */
function endpoint(pages: Record<string, Page>) {
  return jest.fn((cursor: string, _signal?: AbortSignal) => {
    const page = pages[cursor];
    if (!page) throw new Error(`unexpected cursor ${cursor}`);
    return respond(page);
  });
}

const run = (options: { queryFn: (context?: object) => Promise<number[]> }) =>
  options.queryFn({});

describe("esiCursorQueryOptions", () => {
  it("follows the cursor in its direction until a short page", async () => {
    const fetchPage = endpoint({
      "0": { rows: full(0), cursor: { before: "b1", after: "a1" } },
      b1: { rows: full(100), cursor: { before: "b2", after: "a2" } },
      b2: { rows: [200, 201], cursor: { before: "b3", after: "a3" } },
    });

    const rows = await run(
      esiCursorQueryOptions({
        queryKey: ["jobs"],
        direction: "before",
        fetchPage,
        items: (data: Page) => data.rows,
      }),
    );

    expect(rows).toHaveLength(202);
    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual([
      "0",
      "b1",
      "b2",
    ]);
  });

  it("walks `after` when asked to", async () => {
    const fetchPage = endpoint({
      "0": { rows: full(0), cursor: { before: "b1", after: "a1" } },
      a1: { rows: [], cursor: { before: "b2", after: "a2" } },
    });

    const rows = await run(
      esiCursorQueryOptions({
        queryKey: ["jobs"],
        direction: "after",
        fetchPage,
        items: (data: Page) => data.rows,
      }),
    );

    // A full page is followed even when the next one turns out empty: ESI
    // cannot say a full page is the last.
    expect(rows).toEqual(full(0));
    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual(["0", "a1"]);
  });

  it.each([
    ["no cursor object", undefined],
    ["no cursor in that direction", { after: "a1" }],
    ["an empty cursor", { before: "" }],
    ["the same cursor again", { before: "0" }],
  ])("stops on a full page carrying %s", async (_label, cursor) => {
    const fetchPage = endpoint({ "0": { rows: full(0), cursor } });

    const rows = await run(
      esiCursorQueryOptions({
        queryKey: ["jobs"],
        direction: "before",
        fetchPage,
        items: (data: Page) => data.rows,
      }),
    );

    expect(rows).toHaveLength(ESI_CURSOR_PAGE_SIZE);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("refuses a collection past the page ceiling instead of truncating it", async () => {
    let n = 0;
    const fetchPage = jest.fn(() =>
      respond({ rows: full(0), cursor: { after: `a${++n}` } }),
    );

    await expect(
      run(
        esiCursorQueryOptions({
          queryKey: ["jobs"],
          direction: "after",
          fetchPage,
          items: (data: Page) => data.rows,
        }),
      ),
    ).rejects.toBeInstanceOf(EsiCursorCeilingError);
    expect(fetchPage).toHaveBeenCalledTimes(200);
  });

  it("does not retry the ceiling refusal, and defers to the ESI policy otherwise", () => {
    const { retry } = esiCursorQueryOptions({
      queryKey: ["jobs"],
      direction: "after",
      fetchPage: endpoint({}),
      items: (data: Page) => data.rows,
    });

    expect(retry(0, new EsiCursorCeilingError())).toBe(false);
    expect(retry(0, new Error("network"))).toBe(true);
    expect(retry(3, new Error("network"))).toBe(false);
  });

  it("threads the abort signal into every page", async () => {
    const fetchPage = endpoint({
      "0": { rows: full(0), cursor: { after: "a1" } },
      a1: { rows: [1] },
    });
    const controller = new AbortController();

    await esiCursorQueryOptions({
      queryKey: ["jobs"],
      direction: "after",
      fetchPage,
      items: (data: Page) => data.rows,
    }).queryFn({ signal: controller.signal });

    expect(fetchPage.mock.calls.map(([, signal]) => signal)).toEqual([
      controller.signal,
      controller.signal,
    ]);
  });

  it("marks the key as a whole collection and passes `enabled` through", () => {
    const options = esiCursorQueryOptions({
      queryKey: [{ url: "/freelance-jobs" }],
      direction: "before",
      fetchPage: endpoint({}),
      items: (data: Page) => data.rows,
      enabled: false,
    });

    expect(options.queryKey).toEqual([
      { url: "/freelance-jobs" },
      ESI_QUERY_KEY_MARKER.allPages,
    ]);
    expect(options.enabled).toBe(false);
  });
});
