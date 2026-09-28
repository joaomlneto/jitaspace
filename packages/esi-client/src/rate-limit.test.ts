import buildData from "./build-data.json";
import {
  cleanupTokens,
  consumeTokens,
  getAllRateLimitGroups,
  getRateLimitBucketConfigs,
  getRateLimitBucketKey,
  getRateLimitRequestHistoryWindowSeconds,
  getRateLimitState,
  getWaitTime,
  recordRateLimitRequest,
  subscribeToRateLimitState,
  updateRateLimitState,
  updateRetryAfter,
} from "./rate-limit";

const STATUS_GROUP = "status";
const MARKET_GROUP = "market-order";
const TEST_USER_A = "pilot-a";
const TEST_USER_B = "pilot-b";

const resetRateLimitState = () => {
  const state = getRateLimitState() as Record<string, unknown>;
  for (const bucketKey of Object.keys(state)) {
    delete state[bucketKey];
  }
};

describe("rate-limit", () => {
  let now = Date.UTC(2026, 0, 1, 0, 0, 0);

  beforeEach(() => {
    now = Date.UTC(2026, 0, 1, 0, 0, 0);
    jest.spyOn(Date, "now").mockImplementation(() => now);
    resetRateLimitState();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("exposes authoritative bucket config for grouped routes", () => {
    const bucketConfigs = getRateLimitBucketConfigs();

    expect(bucketConfigs.status).toMatchObject({
      group: STATUS_GROUP,
      maxTokens: 600,
      windowSize: "15m",
      windowSeconds: 900,
    });
    expect(
      bucketConfigs.status?.routeMatchers.some((matcher) =>
        matcher.startsWith("get:/status"),
      ),
    ).toBe(true);
    expect(bucketConfigs.status?.routeCount).toBeGreaterThan(0);
  });

  it("tracks rate-limit buckets independently per user", () => {
    consumeTokens(STATUS_GROUP, 2, TEST_USER_A);
    consumeTokens(STATUS_GROUP, 1, TEST_USER_B);

    const state = getRateLimitState();
    const bucketA = state[getRateLimitBucketKey(STATUS_GROUP, TEST_USER_A)];
    const bucketB = state[getRateLimitBucketKey(STATUS_GROUP, TEST_USER_B)];

    expect(bucketA?.remaining).toBe(598);
    expect(bucketB?.remaining).toBe(599);
    expect(getAllRateLimitGroups()).toContain(STATUS_GROUP);
  });

  it("releases consumed tokens over the configured floating window", () => {
    updateRateLimitState(
      STATUS_GROUP,
      {
        "x-ratelimit-limit": "5/1m",
        "x-ratelimit-remaining": "5",
      },
      TEST_USER_A,
    );

    consumeTokens(STATUS_GROUP, 5, TEST_USER_A);

    expect(getWaitTime(STATUS_GROUP, 1, TEST_USER_A)).toBe(60_000);

    now += 30_000;
    cleanupTokens();
    expect(getWaitTime(STATUS_GROUP, 1, TEST_USER_A)).toBe(30_000);

    now += 30_001;
    cleanupTokens();

    const state = getRateLimitState();
    const bucket = state[getRateLimitBucketKey(STATUS_GROUP, TEST_USER_A)];
    expect(bucket?.remaining).toBe(5);
    expect(getWaitTime(STATUS_GROUP, 1, TEST_USER_A)).toBe(0);
  });

  it("syncs a heavily used bucket without replaying its tokens one by one", () => {
    // One /market/[typeId] view spends ~230 tokens, so a few items in every
    // response carried thousands of used tokens. Syncing replayed them one at
    // a time through a limiter that rescans its history per token — ~190 ms of
    // blocked main thread per response at 1,000 used, ~2.4 s at 4,000 — and
    // armed a 15-minute timer for each.
    const setTimeoutSpy = jest.spyOn(globalThis, "setTimeout");

    updateRateLimitState(
      MARKET_GROUP,
      {
        "x-ratelimit-limit": "12000/15m",
        "x-ratelimit-remaining": "8000",
      },
      TEST_USER_A,
    );
    consumeTokens(MARKET_GROUP, 5, TEST_USER_A);
    consumeTokens(MARKET_GROUP, -3, TEST_USER_A);

    const bucket =
      getRateLimitState()[getRateLimitBucketKey(MARKET_GROUP, TEST_USER_A)];
    expect(bucket?.remaining).toBe(7998);
    expect(bucket?.consumedTokens).toEqual([
      { timestamp: now, tokens: 4000 },
      { timestamp: now, tokens: 2 },
    ]);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
  });

  it("keeps released buckets' tokens on the time they were spent", () => {
    // Releasing tokens used to rebuild the limiter by re-executing every
    // remaining token at the current time, so they expired a full window after
    // the release instead of after they were spent.
    updateRateLimitState(
      STATUS_GROUP,
      {
        "x-ratelimit-limit": "5/1m",
        "x-ratelimit-remaining": "5",
      },
      TEST_USER_A,
    );
    consumeTokens(STATUS_GROUP, 3, TEST_USER_A);
    now += 30_000;
    consumeTokens(STATUS_GROUP, 2, TEST_USER_A);
    now += 10_000;
    consumeTokens(STATUS_GROUP, -1, TEST_USER_A);

    // A window after the first three were spent, only the one left from the
    // second spend still counts.
    now += 20_000;
    cleanupTokens();

    const bucket =
      getRateLimitState()[getRateLimitBucketKey(STATUS_GROUP, TEST_USER_A)];
    expect(bucket?.remaining).toBe(4);
    expect(getWaitTime(STATUS_GROUP, 4, TEST_USER_A)).toBe(0);
  });

  it("honors retry-after and keeps the strictest active delay", () => {
    updateRateLimitState(
      STATUS_GROUP,
      {
        "x-ratelimit-limit": "10/1m",
        "x-ratelimit-remaining": "10",
      },
      TEST_USER_A,
    );

    expect(updateRetryAfter(STATUS_GROUP, 20, TEST_USER_A)).toBe(true);
    expect(updateRetryAfter(STATUS_GROUP, 10, TEST_USER_A)).toBe(false);
    expect(getWaitTime(STATUS_GROUP, 1, TEST_USER_A)).toBe(20_000);

    now += 20_001;
    cleanupTokens();

    expect(getWaitTime(STATUS_GROUP, 1, TEST_USER_A)).toBe(0);
  });

  it("records request history within the configured retention window and notifies subscribers", () => {
    const subscriber = jest.fn();
    const unsubscribe = subscribeToRateLimitState(subscriber);

    updateRateLimitState(
      STATUS_GROUP,
      {
        "x-ratelimit-limit": "10/1m",
        "x-ratelimit-remaining": "9",
      },
      TEST_USER_A,
    );

    const historyWindowSeconds = getRateLimitRequestHistoryWindowSeconds();
    const oldTimestamp = now - historyWindowSeconds * 1000 - 1;

    expect(
      recordRateLimitRequest(
        STATUS_GROUP,
        {
          endpoint: "/status",
          params: { page: 1 },
          statusCode: 200,
          tokenCost: 2,
          timestamp: oldTimestamp,
        },
        TEST_USER_A,
      ),
    ).toBe(true);

    expect(
      recordRateLimitRequest(
        STATUS_GROUP,
        {
          endpoint: "/status",
          params: { page: 2 },
          statusCode: 304,
          tokenCost: 1,
        },
        TEST_USER_A,
      ),
    ).toBe(true);

    const state = getRateLimitState();
    const bucket = state[getRateLimitBucketKey(STATUS_GROUP, TEST_USER_A)];

    expect(bucket?.requestHistory).toHaveLength(1);
    expect(bucket?.requestHistory[0]?.params).toEqual({ page: 2 });
    expect(subscriber).toHaveBeenCalled();

    const calledBeforeUnsubscribe = subscriber.mock.calls.length;
    unsubscribe();
    recordRateLimitRequest(
      STATUS_GROUP,
      {
        endpoint: "/status",
        params: { page: 3 },
        statusCode: 200,
        tokenCost: 2,
      },
      TEST_USER_A,
    );
    expect(subscriber.mock.calls.length).toBe(calledBeforeUnsubscribe);
  });

  it("keeps build-data route groups and bucket configs consistent", () => {
    const bucketConfigs = getRateLimitBucketConfigs();
    const typedBuildData = buildData as {
      rateLimits?: Record<string, { maxTokens: number; windowSize: string }>;
      operationRateLimitGroups?: Record<string, string>;
      routeOperationIds?: Record<string, string>;
    };

    for (const [group, config] of Object.entries(
      typedBuildData.rateLimits ?? {},
    )) {
      expect(bucketConfigs[group]).toBeDefined();
      expect(bucketConfigs[group]?.maxTokens).toBe(config.maxTokens);
      expect(bucketConfigs[group]?.windowSize).toBe(config.windowSize);
      expect(bucketConfigs[group]?.routeCount).toBe(
        bucketConfigs[group]?.routeMatchers.length,
      );
    }

    for (const group of Object.values(
      typedBuildData.operationRateLimitGroups ?? {},
    )) {
      expect(bucketConfigs[group]).toBeDefined();
      expect(bucketConfigs[group]?.routeCount).toBeGreaterThan(0);
    }

    for (const operationId of Object.values(
      typedBuildData.routeOperationIds ?? {},
    )) {
      expect(
        typedBuildData.operationRateLimitGroups?.[operationId],
      ).toBeDefined();
    }
  });
});
