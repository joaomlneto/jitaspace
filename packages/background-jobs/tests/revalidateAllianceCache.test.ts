import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type { JobContext } from "../core";
import type { revalidateAllianceCache as RevalidateAllianceCache } from "../jobs/scrape/esi/revalidateAllianceCache";
import { NonRetriableError } from "../core";

const SECRET = "0123456789abcdef-test-secret";

// The job reads its config through `env`; a mutable stand-in lets each test
// choose it. @swc/jest does not hoist jest.mock, so the module under test is
// imported lazily, after this is registered.
const mockEnv: { CRON_SECRET?: string; NEXT_PUBLIC_SITE_URL?: string } = {};
jest.mock("../env", () => ({ env: mockEnv }));

let revalidateAllianceCache: typeof RevalidateAllianceCache;

beforeAll(async () => {
  ({ revalidateAllianceCache } =
    await import("../jobs/scrape/esi/revalidateAllianceCache"));
});

const fetchMock = jest.fn<typeof fetch>();
const realFetch = globalThis.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  globalThis.fetch = fetchMock;
  mockEnv.CRON_SECRET = SECRET;
  mockEnv.NEXT_PUBLIC_SITE_URL = "https://preview.jita.space";
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const run = (allianceIds: number[]) =>
  revalidateAllianceCache.handler({
    payload: { allianceIds },
    attempt: 1,
    logger: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  } as unknown as JobContext<{ allianceIds: number[] }>);

describe("revalidate-alliance-cache", () => {
  it("POSTs the alliance IDs and the secret to the web app", async () => {
    const result = await run([1, 2]);

    expect(result).toEqual({
      url: "https://preview.jita.space/api/revalidate/alliances",
      alliances: 2,
    });
    const [calledUrl, init] = fetchMock.mock.calls[0] ?? [];
    expect(calledUrl).toBe(
      "https://preview.jita.space/api/revalidate/alliances",
    );
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      authorization: `Bearer ${SECRET}`,
      "content-type": "application/json",
    });
    expect(JSON.parse(init?.body as string)).toEqual({ allianceIds: [1, 2] });
  });

  it("does not retry without a secret", async () => {
    mockEnv.CRON_SECRET = undefined;

    const attempt = run([1]);

    await expect(attempt).rejects.toBeInstanceOf(NonRetriableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves a server error retryable", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));

    const attempt = run([1]);

    await expect(attempt).rejects.not.toBeInstanceOf(NonRetriableError);
    await expect(attempt).rejects.toThrow("answered 503");
  });

  it("is an event job, retried", () => {
    expect(revalidateAllianceCache.id).toBe("revalidate-alliance-cache");
    expect(revalidateAllianceCache.trigger).toEqual({ type: "event" });
    expect(revalidateAllianceCache.retries).toBe(5);
  });
});
