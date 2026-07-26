import { PassThrough, Readable } from "node:stream";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { downloadTarBz2FileAndParseJson as DownloadFn } from "../../utils/downloadFile";

// @swc/jest doesn't hoist jest.mock, so the mock streams are created inside the
// factories (which run lazily) and exposed through these shared references. The
// module under test is imported lazily in beforeAll, after the mocks register.
//
// Both `unbzip2-stream` and `tar-stream` return real `PassThrough` streams so
// `nodeStream.pipe(decompress).pipe(extract)` wires up correctly; the test then
// drives the `entry`/`error`/`finish` events on `extract` by hand to exercise
// each failure and success path deterministically.
let decompress: PassThrough;
let extract: PassThrough & {
  emitEntry: (name: string, content: string) => void;
};

const bz2 = jest.fn(() => {
  decompress = new PassThrough();
  return decompress;
});

const tarExtract = jest.fn(() => {
  const stream = new PassThrough() as typeof extract;
  // Helper mirroring tar-stream: emit an "entry" with a readable body and a
  // `next` callback. Passing an error to `next` destroys the extract stream,
  // which the production code relies on to surface a rejection.
  stream.emitEntry = (name: string, content: string) => {
    const body = new PassThrough();
    const next = (err?: unknown) => {
      if (err) stream.destroy(err as Error);
    };
    stream.emit("entry", { name }, body, next);
    body.end(content);
  };
  extract = stream;
  return stream;
});

jest.mock("unbzip2-stream", () => ({ __esModule: true, default: bz2 }));
jest.mock("tar-stream", () => ({
  __esModule: true,
  default: { extract: tarExtract },
}));

const makeResponse = (body: Readable | null, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? "OK" : "Internal Server Error",
    body: body === null ? null : (Readable.toWeb(body) as never),
  }) as unknown as Response;

let downloadTarBz2FileAndParseJson: typeof DownloadFn;
const fetchMock = jest.fn<typeof fetch>();

beforeAll(async () => {
  ({ downloadTarBz2FileAndParseJson } =
    await import("../../utils/downloadFile"));
});

// A short per-test timeout so a regression that reintroduces the hang fails
// fast instead of stalling the whole suite for Jest's default 5s.
const HANG_GUARD_MS = 1000;

beforeEach(() => {
  global.fetch = fetchMock;
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

const URL = "https://example.test/data.tar.bz2";

describe("downloadTarBz2FileAndParseJson", () => {
  it("resolves to the parsed files on a well-formed archive", async () => {
    const source = new PassThrough();
    fetchMock.mockResolvedValue(makeResponse(source));

    const promise = downloadTarBz2FileAndParseJson(URL);

    // Wait a tick so the pipeline + listeners are wired before driving events.
    await Promise.resolve();
    extract.emitEntry("wars/1.json", JSON.stringify({ id: 1 }));
    extract.emitEntry("wars/2.json", JSON.stringify({ id: 2 }));
    // Give the entry `end` handlers a chance to run before finishing.
    await new Promise((r) => setImmediate(r));
    extract.emit("finish");

    await expect(promise).resolves.toEqual([
      { name: "wars/1.json", content: { id: 1 } },
      { name: "wars/2.json", content: { id: 2 } },
    ]);
  });

  it(
    "rejects (does not hang) when the source stream errors",
    async () => {
      const source = new PassThrough();
      fetchMock.mockResolvedValue(makeResponse(source));

      const promise = downloadTarBz2FileAndParseJson(URL);

      await Promise.resolve();
      const boom = new Error("truncated download");
      // The Web->Node stream conversion means the error must surface on the
      // decompressor (downstream of the fetch body); either way the pipeline
      // must reject rather than hang.
      decompress.emit("error", boom);

      await expect(promise).rejects.toThrow("truncated download");
    },
    HANG_GUARD_MS,
  );

  it(
    "rejects (does not hang) when the extractor errors",
    async () => {
      const source = new PassThrough();
      fetchMock.mockResolvedValue(makeResponse(source));

      const promise = downloadTarBz2FileAndParseJson(URL);

      await Promise.resolve();
      extract.emit("error", new Error("corrupt bz2"));

      await expect(promise).rejects.toThrow("corrupt bz2");
    },
    HANG_GUARD_MS,
  );

  it(
    "rejects with a debuggable message when an entry is not valid JSON",
    async () => {
      const source = new PassThrough();
      fetchMock.mockResolvedValue(makeResponse(source));

      const promise = downloadTarBz2FileAndParseJson(URL);

      await Promise.resolve();
      extract.emitEntry("wars/bad.json", "this is not json");

      await expect(promise).rejects.toThrow(
        /Failed to parse JSON from archive entry "wars\/bad\.json"/,
      );
    },
    HANG_GUARD_MS,
  );

  it("throws when the response is not ok", async () => {
    fetchMock.mockResolvedValue(makeResponse(null, false));
    await expect(downloadTarBz2FileAndParseJson(URL)).rejects.toThrow(
      /Failed to fetch data/,
    );
  });

  it("throws when the response body is null", async () => {
    fetchMock.mockResolvedValue(makeResponse(null, true));
    await expect(downloadTarBz2FileAndParseJson(URL)).rejects.toThrow(
      /Response body is null/,
    );
  });
});
