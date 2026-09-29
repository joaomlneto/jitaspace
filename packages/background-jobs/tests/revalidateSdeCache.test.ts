import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import type * as RevalidateSdeCacheModule from "../jobs/scrape/sde/revalidateSdeCache";
import { NonRetriableError } from "../core";

const SECRET = "0123456789abcdef-test-secret";

// The job reads its config through `env`; a mutable stand-in lets each test
// choose it. @swc/jest does not hoist jest.mock, so the module under test is
// imported lazily, after this is registered.
const mockEnv: { CRON_SECRET?: string; NEXT_PUBLIC_SITE_URL?: string } = {};
jest.mock("../env", () => ({ env: mockEnv }));

let postSdeCacheRevalidation: typeof RevalidateSdeCacheModule.postSdeCacheRevalidation;
let revalidateSdeCache: typeof RevalidateSdeCacheModule.revalidateSdeCache;

beforeAll(async () => {
  ({ postSdeCacheRevalidation, revalidateSdeCache } =
    await import("../jobs/scrape/sde/revalidateSdeCache"));
});

const fetchMock = jest.fn<typeof fetch>();
const realFetch = globalThis.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("postSdeCacheRevalidation", () => {
  it("POSTs the secret to the web app's revalidate route", async () => {
    const url = await postSdeCacheRevalidation({
      siteUrl: "https://preview.jita.space",
      cronSecret: SECRET,
    });

    expect(url).toBe("https://preview.jita.space/api/revalidate/sde");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchMock.mock.calls[0] ?? [];
    expect(calledUrl).toBe("https://preview.jita.space/api/revalidate/sde");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ authorization: `Bearer ${SECRET}` });
  });

  it("targets production when no site URL is configured, as the web app does", async () => {
    await expect(
      postSdeCacheRevalidation({ siteUrl: undefined, cronSecret: SECRET }),
    ).resolves.toBe("https://www.jita.space/api/revalidate/sde");
  });

  it.each(["https://www.jita.space/", "https://www.jita.space/some/path/"])(
    "uses only the origin of %s",
    async (siteUrl) => {
      await expect(
        postSdeCacheRevalidation({ siteUrl, cronSecret: SECRET }),
      ).resolves.toBe("https://www.jita.space/api/revalidate/sde");
    },
  );

  it("refuses to run without a secret, and does not retry", async () => {
    const attempt = postSdeCacheRevalidation({
      siteUrl: undefined,
      cronSecret: undefined,
    });

    await expect(attempt).rejects.toBeInstanceOf(NonRetriableError);
    await expect(attempt).rejects.toThrow("CRON_SECRET is not set");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not retry a secret the web app rejects", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));

    const attempt = postSdeCacheRevalidation({
      siteUrl: undefined,
      cronSecret: SECRET,
    });

    // Retrying cannot fix a mismatched secret; it only delays the failure that
    // tells someone SDE pages are still on the previous build.
    await expect(attempt).rejects.toBeInstanceOf(NonRetriableError);
    await expect(attempt).rejects.toThrow("401");
  });

  it("leaves a server error retryable", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));

    const attempt = postSdeCacheRevalidation({
      siteUrl: undefined,
      cronSecret: SECRET,
    });

    await expect(attempt).rejects.toThrow("answered 503");
    await expect(attempt).rejects.not.toBeInstanceOf(NonRetriableError);
  });
});

describe("revalidate-sde-cache", () => {
  it("calls the configured site with the configured secret", async () => {
    mockEnv.CRON_SECRET = SECRET;
    mockEnv.NEXT_PUBLIC_SITE_URL = "https://staging.jita.space";
    const info = jest.fn();

    const result = await revalidateSdeCache.handler({
      payload: {},
      attempt: 1,
      logger: { debug: jest.fn(), info, warn: jest.fn(), error: jest.fn() },
    } as unknown as Parameters<typeof revalidateSdeCache.handler>[0]);

    expect(result).toEqual({
      url: "https://staging.jita.space/api/revalidate/sde",
    });
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toEqual({
      authorization: `Bearer ${SECRET}`,
    });
    expect(info).toHaveBeenCalledWith(
      "Revalidated the SDE cache at https://staging.jita.space/api/revalidate/sde",
    );
  });

  it("is an event job, retried, one run at a time", () => {
    expect(revalidateSdeCache.id).toBe("revalidate-sde-cache");
    expect(revalidateSdeCache.trigger).toEqual({ type: "event" });
    expect(revalidateSdeCache.concurrencyLimit).toBe(1);
    expect(revalidateSdeCache.retries).toBeGreaterThan(0);
  });
});
