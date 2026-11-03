import type { ResponseConfig } from "./client";
import type { EsiCursor, EsiCursorPageRequest } from "./cursor";
import {
  ESI_CURSOR_PAGE_SIZE,
  ESI_NO_CACHE_HEADERS,
  EsiCursorCeilingError,
  walkEsiCursor,
} from "./cursor";

interface Page {
  cursor?: EsiCursor;
  rows: { id: number; v?: string }[];
}

const full = (start: number): Page["rows"] =>
  Array.from({ length: ESI_CURSOR_PAGE_SIZE }, (_, i) => ({ id: start + i }));

const respond = (data: Page) =>
  Promise.resolve({ data, headers: {} } as ResponseConfig<Page>);

/** A fake endpoint serving `pages`, keyed by the cursor that asks for each. */
const endpoint = (pages: Record<string, Page>) =>
  jest.fn((cursor: string, _request: EsiCursorPageRequest) => {
    const page = pages[cursor];
    if (!page) throw new Error(`unexpected cursor ${cursor}`);
    return respond(page);
  });

const rows = (data: Page) => data.rows;

describe("walkEsiCursor", () => {
  it("starts at 0, follows its direction and stops at a short page", async () => {
    const fetchPage = endpoint({
      "0": { rows: full(0), cursor: { after: "a1", before: "b1" } },
      a1: { rows: [{ id: 500 }], cursor: { after: "a2", before: "b2" } },
    });

    const result = await walkEsiCursor({
      direction: "after",
      fetchPage,
      items: rows,
    });

    expect(result).toHaveLength(ESI_CURSOR_PAGE_SIZE + 1);
    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual(["0", "a1"]);
  });

  it("stops when ESI returns no cursor, or the same one again", async () => {
    const noCursor = endpoint({ "0": { rows: full(0) } });
    await walkEsiCursor({
      direction: "before",
      fetchPage: noCursor,
      items: rows,
    });
    expect(noCursor).toHaveBeenCalledTimes(1);

    const stuck = endpoint({
      "0": { rows: full(0), cursor: { before: "x" } },
      x: { rows: full(100), cursor: { before: "x" } },
    });
    await walkEsiCursor({ direction: "before", fetchPage: stuck, items: rows });
    expect(stuck).toHaveBeenCalledTimes(2);
  });

  it("asks for every page fresh, with the abort signal", async () => {
    const fetchPage = endpoint({
      "0": { rows: full(0), cursor: { after: "a1" } },
      a1: { rows: [] },
    });
    const signal = new AbortController().signal;

    await walkEsiCursor({ direction: "after", fetchPage, items: rows, signal });

    for (const [, request] of fetchPage.mock.calls) {
      expect(request).toEqual({ signal, headers: ESI_NO_CACHE_HEADERS });
    }
  });

  it("keeps the later copy of a record read twice, in the earlier's place", async () => {
    const first = full(0);
    first[0] = { id: 0, v: "old" };
    const fetchPage = endpoint({
      "0": { rows: first, cursor: { after: "a1" } },
      a1: { rows: [{ id: 0, v: "new" }] },
    });

    const result = await walkEsiCursor({
      direction: "after",
      fetchPage,
      items: rows,
      key: (row) => row.id,
    });

    expect(result).toHaveLength(ESI_CURSOR_PAGE_SIZE);
    expect(result[0]).toEqual({ id: 0, v: "new" });
  });

  it("refuses a walk that never ends instead of returning part of it", async () => {
    let n = 0;
    const fetchPage = jest.fn(() =>
      respond({ rows: full(0), cursor: { after: `a${++n}` } }),
    );

    await expect(
      walkEsiCursor({ direction: "after", fetchPage, items: rows }),
    ).rejects.toBeInstanceOf(EsiCursorCeilingError);
    expect(fetchPage).toHaveBeenCalledTimes(200);
  });
});
