import type { ResponseConfig } from "./client";
import type { EsiCursor } from "./cursor";
import {
  EsiCursorCeilingError,
  fetchAllEsiCursorPages,
  MAX_ESI_CURSOR_PAGES,
} from "./cursor";

interface Page {
  cursor?: EsiCursor;
  records: number[];
}

const response = (data: Page): ResponseConfig<Page> => ({
  data,
  status: 200,
  statusText: "OK",
  headers: { etag: "first" },
});

/** A collection of `pages`, newest first, walked back by `before` cursors. */
const fakeCollection = (pages: number[][]) => {
  const fetchPage = jest.fn((before: string | undefined) => {
    const index = before === undefined ? 0 : Number(before);
    return Promise.resolve(
      response({
        records: pages[index] ?? [],
        cursor: { before: String(index + 1), after: "ignored" },
      }),
    );
  });
  return fetchPage;
};

describe("fetchAllEsiCursorPages", () => {
  it("walks `before` until a page comes back empty", async () => {
    const fetchPage = fakeCollection([[1, 2], [3, 4], [5]]);

    const result = await fetchAllEsiCursorPages(fetchPage, (p) => p.records);

    expect(result.data).toEqual([1, 2, 3, 4, 5]);
    expect(fetchPage.mock.calls.map(([before]) => before)).toEqual([
      undefined,
      "1",
      "2",
      "3",
    ]);
    // Shaped like the first response, so callers cannot tell it was paged.
    expect(result.status).toBe(200);
    expect(result.headers).toEqual({ etag: "first" });
  });

  it("makes one request for an empty collection", async () => {
    const fetchPage = fakeCollection([]);

    const result = await fetchAllEsiCursorPages(fetchPage, (p) => p.records);

    expect(result.data).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("stops when a page has no cursor", async () => {
    const fetchPage = jest.fn(() =>
      Promise.resolve(response({ records: [1] })),
    );

    const result = await fetchAllEsiCursorPages(fetchPage, (p) => p.records);

    expect(result.data).toEqual([1]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("stops when the cursor does not advance", async () => {
    const fetchPage = jest.fn(() =>
      Promise.resolve(response({ records: [1], cursor: { before: "same" } })),
    );

    const result = await fetchAllEsiCursorPages(fetchPage, (p) => p.records);

    expect(result.data).toEqual([1, 1]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("refuses a walk that never ends instead of returning part of it", async () => {
    let counter = 0;
    const fetchPage = jest.fn(() =>
      Promise.resolve(
        response({ records: [counter], cursor: { before: String(counter++) } }),
      ),
    );

    await expect(
      fetchAllEsiCursorPages(fetchPage, (p) => p.records),
    ).rejects.toBeInstanceOf(EsiCursorCeilingError);
    expect(fetchPage).toHaveBeenCalledTimes(MAX_ESI_CURSOR_PAGES);
  });

  it("propagates a failed page", async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(
        response({ records: [1], cursor: { before: "1" } }),
      )
      .mockRejectedValueOnce(new Error("HTTP 502"));

    await expect(
      fetchAllEsiCursorPages(fetchPage, (p: Page) => p.records),
    ).rejects.toThrow("HTTP 502");
  });
});
