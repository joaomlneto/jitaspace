import type { AxiosError } from "axios";

import buildData from "./build-data.json";
import { axiosInstance, client, setConfig, setUserAgent } from "./client";
import {
  getRateLimitBucketKey,
  getRateLimitState,
  getWaitTime,
} from "./rate-limit";

const STATUS_GROUP = "status";
const TEST_USER = "anonymous";
const CHAR_SOCIAL_GROUP = "char-social";

const resetRateLimitState = () => {
  const state = getRateLimitState() as Record<string, unknown>;
  for (const bucketKey of Object.keys(state)) {
    delete state[bucketKey];
  }
};

const makeAxiosError = (
  status: number,
  headers: Record<string, unknown> = {},
): AxiosError =>
  ({
    response: {
      status,
      statusText: `${status}`,
      headers,
      data: {},
    },
  }) as AxiosError;

const makeJwt = (payload: Record<string, unknown>) => {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );
  return `header.${encodedPayload}.signature`;
};

describe("client rate-limit integration", () => {
  let now = Date.UTC(2026, 0, 1, 0, 0, 0);

  beforeEach(() => {
    now = Date.UTC(2026, 0, 1, 0, 0, 0);
    jest.spyOn(Date, "now").mockImplementation(() => now);
    setConfig({});
    resetRateLimitState();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("syncs bucket state from ESI rate-limit headers on successful responses", async () => {
    jest.spyOn(axiosInstance, "request").mockResolvedValue({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {
        "x-ratelimit-limit": "10/1m",
        "x-ratelimit-remaining": "7",
        "x-ratelimit-used": "3",
      },
    });

    await client({
      method: "GET",
      url: "https://esi.evetech.net/status?datasource=tranquility",
    });

    const state = getRateLimitState();
    const bucket = state[getRateLimitBucketKey(STATUS_GROUP, TEST_USER)];

    expect(bucket?.limit).toBe(10);
    expect(bucket?.remaining).toBe(7);
    expect(bucket?.consumedTokens).toHaveLength(3);
    expect(bucket?.requestHistory[0]?.tokenCost).toBe(3);
    expect(bucket?.requestHistory[0]?.endpoint).toBe("/status");
  });

  it("falls back to token-cost rules when headers are missing for success and redirects", async () => {
    jest.spyOn(axiosInstance, "request").mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
    });

    await client({ method: "GET", url: "/status" });

    let state = getRateLimitState();
    let bucket = state[getRateLimitBucketKey(STATUS_GROUP, TEST_USER)];

    expect(bucket?.remaining).toBe(598);
    expect(bucket?.requestHistory[0]?.tokenCost).toBe(2);

    jest.spyOn(axiosInstance, "request").mockResolvedValueOnce({
      data: null,
      status: 304,
      statusText: "Not Modified",
      headers: {},
    });

    await client({ method: "GET", url: "/status" });

    state = getRateLimitState();
    bucket = state[getRateLimitBucketKey(STATUS_GROUP, TEST_USER)];

    expect(bucket?.remaining).toBe(597);
    expect(bucket?.requestHistory[1]?.tokenCost).toBe(1);
  });

  it("applies token-cost fallback for client and server errors", async () => {
    const requestSpy = jest.spyOn(axiosInstance, "request");

    const notFoundError = makeAxiosError(404);
    requestSpy.mockRejectedValueOnce(notFoundError);

    await expect(client({ method: "GET", url: "/status" })).rejects.toBe(
      notFoundError,
    );

    let state = getRateLimitState();
    let bucket = state[getRateLimitBucketKey(STATUS_GROUP, TEST_USER)];

    expect(bucket?.remaining).toBe(595);
    expect(bucket?.requestHistory[0]?.tokenCost).toBe(5);

    const serverError = makeAxiosError(503);
    requestSpy.mockRejectedValueOnce(serverError);

    await expect(client({ method: "GET", url: "/status" })).rejects.toBe(
      serverError,
    );

    state = getRateLimitState();
    bucket = state[getRateLimitBucketKey(STATUS_GROUP, TEST_USER)];

    expect(bucket?.remaining).toBe(595);
    expect(bucket?.requestHistory[1]?.tokenCost).toBe(0);
  });

  it("stores retry-after delays from 429 responses", async () => {
    const tooManyRequestsError = makeAxiosError(429, {
      "retry-after": "12",
    });
    jest
      .spyOn(axiosInstance, "request")
      .mockRejectedValueOnce(tooManyRequestsError);

    await expect(client({ method: "GET", url: "/status" })).rejects.toBe(
      tooManyRequestsError,
    );

    expect(getWaitTime(STATUS_GROUP, 1, TEST_USER)).toBe(12_000);
  });

  it("falls back to token-cost rules when only global error-limit headers are present", async () => {
    const userId = "global-error-limit-only";
    const globalErrorLimitedResponse = makeAxiosError(420, {
      "x-esi-error-limit-remain": "0",
      "x-esi-error-limit-reset": "59",
    });

    jest
      .spyOn(axiosInstance, "request")
      .mockRejectedValueOnce(globalErrorLimitedResponse);

    await expect(
      client({ method: "GET", url: "/status", rateLimitUserId: userId }),
    ).rejects.toBe(globalErrorLimitedResponse);

    const state = getRateLimitState();
    const bucket = state[getRateLimitBucketKey(STATUS_GROUP, userId)];

    expect(bucket?.remaining).toBe(595);
    expect(bucket?.requestHistory).toHaveLength(1);
    expect(bucket?.requestHistory[0]?.statusCode).toBe(420);
    expect(bucket?.requestHistory[0]?.tokenCost).toBe(5);
  });

  it("prefers bucket headers when global and bucket limit headers are both present", async () => {
    const userId = "global-and-bucket-headers";
    const responseWithBothHeaderFamilies = makeAxiosError(420, {
      "x-esi-error-limit-remain": "0",
      "x-esi-error-limit-reset": "41",
      "x-ratelimit-limit": "10/1m",
      "x-ratelimit-remaining": "3",
      "x-ratelimit-used": "4",
    });

    jest
      .spyOn(axiosInstance, "request")
      .mockRejectedValueOnce(responseWithBothHeaderFamilies);

    await expect(
      client({ method: "GET", url: "/status", rateLimitUserId: userId }),
    ).rejects.toBe(responseWithBothHeaderFamilies);

    const state = getRateLimitState();
    const bucket = state[getRateLimitBucketKey(STATUS_GROUP, userId)];

    expect(bucket?.limit).toBe(10);
    expect(bucket?.remaining).toBe(3);
    expect(bucket?.requestHistory[0]?.tokenCost).toBe(4);
  });

  it("uses safe fallbacks for malformed ratelimit header values", async () => {
    const userId = "malformed-ratelimit-headers";
    jest.spyOn(axiosInstance, "request").mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {
        "x-ratelimit-limit": "12/invalid-window",
        "x-ratelimit-remaining": "11",
        "x-ratelimit-used": "NaN",
      },
    });

    await client({ method: "GET", url: "/status", rateLimitUserId: userId });

    const state = getRateLimitState();
    const bucket = state[getRateLimitBucketKey(STATUS_GROUP, userId)];

    expect(bucket?.limit).toBe(12);
    expect(bucket?.windowSeconds).toBe(900);
    expect(bucket?.remaining).toBe(11);
    expect(bucket?.requestHistory[0]?.tokenCost).toBe(2);
  });

  it("parses retry-after from mixed-case array headers", async () => {
    const userId = "retry-after-array-header";
    const tooManyRequestsError = makeAxiosError(429, {
      "ReTrY-AfTeR": ["6"],
    });

    jest
      .spyOn(axiosInstance, "request")
      .mockRejectedValueOnce(tooManyRequestsError);

    await expect(
      client({ method: "GET", url: "/status", rateLimitUserId: userId }),
    ).rejects.toBe(tooManyRequestsError);

    const state = getRateLimitState();
    const bucket = state[getRateLimitBucketKey(STATUS_GROUP, userId)];

    expect(bucket?.remaining).toBe(bucket?.limit);
    expect(bucket?.requestHistory[0]?.tokenCost).toBe(0);
    expect(getWaitTime(STATUS_GROUP, 1, userId)).toBe(6_000);
  });

  it("applies token-cost rules across route, method, and status permutations", async () => {
    const requestSpy = jest.spyOn(axiosInstance, "request");
    const permutations: Array<{
      method: "GET" | "POST" | "PUT" | "DELETE";
      url: string;
      endpoint: string;
      group: string;
      status: number;
      expectedTokenCost: number;
      isError: boolean;
    }> = [
      {
        method: "GET",
        url: "/status",
        endpoint: "/status",
        group: STATUS_GROUP,
        status: 200,
        expectedTokenCost: 2,
        isError: false,
      },
      {
        method: "GET",
        url: "https://esi.evetech.net/meta/status?datasource=tranquility",
        endpoint: "/meta/status",
        group: "meta",
        status: 304,
        expectedTokenCost: 1,
        isError: false,
      },
      {
        method: "POST",
        url: "/characters/123/contacts",
        endpoint: "/characters/123/contacts",
        group: CHAR_SOCIAL_GROUP,
        status: 201,
        expectedTokenCost: 2,
        isError: false,
      },
      {
        method: "PUT",
        url: "/characters/123/contacts",
        endpoint: "/characters/123/contacts",
        group: CHAR_SOCIAL_GROUP,
        status: 404,
        expectedTokenCost: 5,
        isError: true,
      },
      {
        method: "DELETE",
        url: "/characters/123/contacts",
        endpoint: "/characters/123/contacts",
        group: CHAR_SOCIAL_GROUP,
        status: 503,
        expectedTokenCost: 0,
        isError: true,
      },
      {
        method: "GET",
        url: "/characters/123/contacts",
        endpoint: "/characters/123/contacts",
        group: CHAR_SOCIAL_GROUP,
        status: 429,
        expectedTokenCost: 0,
        isError: true,
      },
    ];

    for (const [index, permutation] of permutations.entries()) {
      const userId = `permutation-user-${index}`;

      if (permutation.isError) {
        const error = makeAxiosError(permutation.status);
        requestSpy.mockRejectedValueOnce(error);
        await expect(
          client({
            method: permutation.method,
            url: permutation.url,
            rateLimitUserId: userId,
          }),
        ).rejects.toBe(error);
      } else {
        requestSpy.mockResolvedValueOnce({
          data: { ok: true },
          status: permutation.status,
          statusText: `${permutation.status}`,
          headers: {},
        });
        await client({
          method: permutation.method,
          url: permutation.url,
          rateLimitUserId: userId,
        });
      }

      const state = getRateLimitState();
      const bucket = state[getRateLimitBucketKey(permutation.group, userId)];

      expect(bucket).toBeDefined();
      expect(bucket?.group).toBe(permutation.group);
      expect(bucket?.requestHistory).toHaveLength(1);
      expect(bucket?.requestHistory[0]?.endpoint).toBe(permutation.endpoint);
      expect(bucket?.requestHistory[0]?.statusCode).toBe(permutation.status);
      expect(bucket?.requestHistory[0]?.tokenCost).toBe(
        permutation.expectedTokenCost,
      );

      const expectedRemaining =
        (bucket?.limit ?? 0) - permutation.expectedTokenCost;
      expect(bucket?.remaining).toBe(expectedRemaining);
    }
  });

  it("derives rate-limit user bucket from JWT azp/sub claims", async () => {
    const token = makeJwt({ azp: "my-app", sub: "CHARACTER:EVE:987654" });

    jest.spyOn(axiosInstance, "request").mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
    });

    await client({
      method: "GET",
      url: "/status",
      headers: { Authorization: `Bearer ${token}` },
    });

    const state = getRateLimitState();
    const bucket = state[getRateLimitBucketKey(STATUS_GROUP, "my-app:987654")];

    expect(bucket?.remaining).toBe(598);
  });

  it("always sends a compatibility-date header when user omits it", async () => {
    const requestSpy = jest
      .spyOn(axiosInstance, "request")
      .mockResolvedValueOnce({
        data: { ok: true },
        status: 200,
        statusText: "OK",
        headers: {},
      });

    await client({
      method: "GET",
      url: "/status",
      headers: {
        "X-Compatibility-Date": undefined,
      },
    });

    const requestHeaders = requestSpy.mock.calls[0]?.[0]?.headers as Record<
      string,
      unknown
    >;

    expect(requestHeaders["X-Compatibility-Date"]).toBe(buildData.buildDate);
  });

  it("allows users to configure user-agent globally and per request", async () => {
    const requestSpy = jest.spyOn(axiosInstance, "request");
    setConfig({ userAgent: "global-agent/2.0" });

    requestSpy.mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
    });

    await client({ method: "GET", url: "/status" });

    let requestHeaders = requestSpy.mock.calls[0]?.[0]?.headers as Record<
      string,
      unknown
    >;
    expect(requestHeaders["X-User-Agent"]).toBe("global-agent/2.0");

    requestSpy.mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
    });

    await client({
      method: "GET",
      url: "/status",
      userAgent: "request-agent/3.0",
    });

    requestHeaders = requestSpy.mock.calls[1]?.[0]?.headers as Record<
      string,
      unknown
    >;
    expect(requestHeaders["X-User-Agent"]).toBe("request-agent/3.0");
  });

  it("allows updating user-agent without dropping existing global headers", async () => {
    const requestSpy = jest.spyOn(axiosInstance, "request");
    setConfig({
      headers: {
        Authorization: "Bearer test-token",
      },
    });
    setUserAgent("global-agent/4.0");

    requestSpy.mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
    });

    await client({ method: "GET", url: "/status" });

    const requestHeaders = requestSpy.mock.calls[0]?.[0]?.headers as Record<
      string,
      unknown
    >;

    expect(requestHeaders["Authorization"]).toBe("Bearer test-token");
    expect(requestHeaders["X-User-Agent"]).toBe("global-agent/4.0");
  });

  it("keeps using route-derived group when x-ratelimit-group header differs", async () => {
    const userId = "group-header-mismatch";
    jest.spyOn(axiosInstance, "request").mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {
        "x-ratelimit-group": "meta",
        "x-ratelimit-limit": "10/1m",
        "x-ratelimit-remaining": "9",
        "x-ratelimit-used": "1",
      },
    });

    await client({ method: "GET", url: "/status", rateLimitUserId: userId });

    const state = getRateLimitState();
    expect(state[getRateLimitBucketKey(STATUS_GROUP, userId)]?.remaining).toBe(
      9,
    );
    expect(state[getRateLimitBucketKey("meta", userId)]).toBeUndefined();
  });

  it("parses hour-sized windows from x-ratelimit-limit headers", async () => {
    const userId = "hour-window";
    jest.spyOn(axiosInstance, "request").mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {
        "x-ratelimit-limit": "12/1h",
        "x-ratelimit-remaining": "8",
      },
    });

    await client({ method: "GET", url: "/status", rateLimitUserId: userId });

    const bucket =
      getRateLimitState()[getRateLimitBucketKey(STATUS_GROUP, userId)];
    expect(bucket?.limit).toBe(12);
    expect(bucket?.windowSeconds).toBe(3600);
    expect(bucket?.remaining).toBe(8);
  });

  it("handles mixed-case, numeric, and array ratelimit header values", async () => {
    const userId = "header-shapes";
    jest.spyOn(axiosInstance, "request").mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {
        "X-RaTeLiMiT-LiMiT": ["15/1m"],
        "X-Ratelimit-Remaining": 11,
        "X-RATELIMIT-USED": [4],
      },
    });

    await client({ method: "GET", url: "/status", rateLimitUserId: userId });

    const bucket =
      getRateLimitState()[getRateLimitBucketKey(STATUS_GROUP, userId)];
    expect(bucket?.limit).toBe(15);
    expect(bucket?.remaining).toBe(11);
    expect(bucket?.requestHistory[0]?.tokenCost).toBe(4);
  });

  it("ignores invalid retry-after header formats", async () => {
    const requestSpy = jest.spyOn(axiosInstance, "request");
    const retryAfterValues: Array<Record<string, unknown>> = [
      {},
      { "retry-after": "0" },
      { "retry-after": "-5" },
      { "retry-after": "Wed, 21 Oct 2015 07:28:00 GMT" },
    ];

    for (const [index, headers] of retryAfterValues.entries()) {
      const userId = `invalid-retry-after-${index}`;
      const error = makeAxiosError(429, headers);
      requestSpy.mockRejectedValueOnce(error);

      await expect(
        client({ method: "GET", url: "/status", rateLimitUserId: userId }),
      ).rejects.toBe(error);

      expect(getWaitTime(STATUS_GROUP, 1, userId)).toBe(0);
    }
  });

  it("applies token-cost rules at status code boundaries", async () => {
    const requestSpy = jest.spyOn(axiosInstance, "request");
    const statusPermutations: Array<{ status: number; tokenCost: number }> = [
      { status: 299, tokenCost: 2 },
      { status: 300, tokenCost: 1 },
      { status: 399, tokenCost: 1 },
      { status: 400, tokenCost: 5 },
      { status: 499, tokenCost: 5 },
      { status: 500, tokenCost: 0 },
    ];

    for (const [index, permutation] of statusPermutations.entries()) {
      const userId = `status-boundary-${index}`;

      if (permutation.status >= 400) {
        const error = makeAxiosError(permutation.status);
        requestSpy.mockRejectedValueOnce(error);
        await expect(
          client({ method: "GET", url: "/status", rateLimitUserId: userId }),
        ).rejects.toBe(error);
      } else {
        requestSpy.mockResolvedValueOnce({
          data: { ok: true },
          status: permutation.status,
          statusText: `${permutation.status}`,
          headers: {},
        });
        await client({
          method: "GET",
          url: "/status",
          rateLimitUserId: userId,
        });
      }

      const bucket =
        getRateLimitState()[getRateLimitBucketKey(STATUS_GROUP, userId)];
      expect(bucket?.requestHistory[0]?.tokenCost).toBe(permutation.tokenCost);
      expect(bucket?.remaining).toBe(
        (bucket?.limit ?? 0) - permutation.tokenCost,
      );
    }
  });

  it("waits before sending when the bucket lacks in-flight capacity", async () => {
    jest.useFakeTimers();

    try {
      const userId = "pre-request-wait";
      const requestSpy = jest
        .spyOn(axiosInstance, "request")
        .mockResolvedValueOnce({
          data: { ok: true },
          status: 200,
          statusText: "OK",
          headers: {
            "x-ratelimit-limit": "5/1m",
            "x-ratelimit-remaining": "0",
            "x-ratelimit-used": "5",
          },
        })
        .mockResolvedValueOnce({
          data: { ok: true },
          status: 200,
          statusText: "OK",
          headers: {},
        });

      await client({ method: "GET", url: "/status", rateLimitUserId: userId });

      const secondRequest = client({
        method: "GET",
        url: "/status",
        rateLimitUserId: userId,
      });

      await Promise.resolve();
      expect(requestSpy).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(60_000);
      await secondRequest;

      expect(requestSpy).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it("reconciles in-flight reservation using x-ratelimit-used for success and errors", async () => {
    const requestSpy = jest.spyOn(axiosInstance, "request");

    const successUserId = "ratelimit-used-success";
    requestSpy.mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {
        "x-ratelimit-used": "1",
      },
    });

    await client({
      method: "GET",
      url: "/status",
      rateLimitUserId: successUserId,
    });

    let bucket =
      getRateLimitState()[getRateLimitBucketKey(STATUS_GROUP, successUserId)];
    expect(bucket?.remaining).toBe(599);

    const errorUserId = "ratelimit-used-error";
    const notFoundError = makeAxiosError(404, { "x-ratelimit-used": "1" });
    requestSpy.mockRejectedValueOnce(notFoundError);

    await expect(
      client({ method: "GET", url: "/status", rateLimitUserId: errorUserId }),
    ).rejects.toBe(notFoundError);

    bucket =
      getRateLimitState()[getRateLimitBucketKey(STATUS_GROUP, errorUserId)];
    expect(bucket?.remaining).toBe(599);
  });

  it("isolates buckets per group for the same user", async () => {
    const userId = "same-user-multi-group";
    const requestSpy = jest.spyOn(axiosInstance, "request");

    requestSpy.mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
    });
    await client({ method: "GET", url: "/status", rateLimitUserId: userId });

    requestSpy.mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
    });
    await client({
      method: "GET",
      url: "/characters/123/contacts",
      rateLimitUserId: userId,
    });

    const state = getRateLimitState();
    const statusBucket = state[getRateLimitBucketKey(STATUS_GROUP, userId)];
    const socialBucket =
      state[getRateLimitBucketKey(CHAR_SOCIAL_GROUP, userId)];

    expect(statusBucket?.requestHistory[0]?.endpoint).toBe("/status");
    expect(socialBucket?.requestHistory[0]?.endpoint).toBe(
      "/characters/123/contacts",
    );
    expect(statusBucket?.remaining).toBe(598);
    expect(socialBucket?.remaining).toBe((socialBucket?.limit ?? 0) - 2);
  });

  it("supports explicit source-ip style user IDs for unauthenticated buckets", async () => {
    const requestSpy = jest.spyOn(axiosInstance, "request");
    requestSpy.mockResolvedValue({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
    });

    await client({
      method: "GET",
      url: "/status",
      rateLimitUserId: "203.0.113.7",
    });
    await client({
      method: "GET",
      url: "/status",
      rateLimitUserId: "203.0.113.7:my-app",
    });

    const state = getRateLimitState();
    expect(
      state[getRateLimitBucketKey(STATUS_GROUP, "203.0.113.7")]?.remaining,
    ).toBe(598);
    expect(
      state[getRateLimitBucketKey(STATUS_GROUP, "203.0.113.7:my-app")]
        ?.remaining,
    ).toBe(598);
  });

  it("falls back to expected user IDs for malformed or partial JWTs", async () => {
    const requestSpy = jest.spyOn(axiosInstance, "request");
    requestSpy.mockResolvedValue({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
    });

    const malformedToken = "bad-token";
    await client({
      method: "GET",
      url: "/status",
      headers: { Authorization: `Bearer ${malformedToken}` },
    });

    await client({
      method: "GET",
      url: "/status",
      headers: {
        Authorization: `Bearer ${makeJwt({ azp: "app-only" })}`,
      },
    });

    await client({
      method: "GET",
      url: "/status",
      headers: {
        Authorization: `Bearer ${makeJwt({ sub: "CHARACTER:EVE:999999" })}`,
      },
    });

    await client({
      method: "GET",
      url: "/status",
      headers: {
        Authorization: `Bearer ${makeJwt({ azp: "app-invalid-sub", sub: "USER:abc" })}`,
      },
    });

    const state = getRateLimitState();
    expect(
      state[getRateLimitBucketKey(STATUS_GROUP, "anonymous")]?.requestHistory,
    ).toHaveLength(2);
    expect(
      state[getRateLimitBucketKey(STATUS_GROUP, "anonymous:app-only")]
        ?.remaining,
    ).toBe(598);
    expect(
      state[getRateLimitBucketKey(STATUS_GROUP, "anonymous:app-invalid-sub")]
        ?.remaining,
    ).toBe(598);
  });

  it("allows follow-up requests after retry-after wait expires", async () => {
    const userId = "retry-after-follow-up";
    const requestSpy = jest.spyOn(axiosInstance, "request");

    const tooManyRequests = makeAxiosError(429, { "retry-after": "2" });
    requestSpy.mockRejectedValueOnce(tooManyRequests);

    await expect(
      client({ method: "GET", url: "/status", rateLimitUserId: userId }),
    ).rejects.toBe(tooManyRequests);
    expect(getWaitTime(STATUS_GROUP, 1, userId)).toBe(2_000);

    now += 2_001;

    requestSpy.mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
    });

    await client({ method: "GET", url: "/status", rateLimitUserId: userId });

    const bucket =
      getRateLimitState()[getRateLimitBucketKey(STATUS_GROUP, userId)];
    expect(bucket?.requestHistory).toHaveLength(2);
    expect(getWaitTime(STATUS_GROUP, 1, userId)).toBe(0);
  });

  it("skips rate-limit tracking for routes that are not in a configured group", async () => {
    jest.spyOn(axiosInstance, "request").mockResolvedValueOnce({
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
    });

    await client({ method: "GET", url: "/unmapped/route" });

    expect(getRateLimitState()).toEqual({});
  });
});
