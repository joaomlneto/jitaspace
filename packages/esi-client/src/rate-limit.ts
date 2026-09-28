import buildData from "./build-data.json";

interface BuildData {
  buildDate: string;
  rateLimits?: Record<
    string,
    {
      maxTokens: number;
      windowSize: string;
    }
  >;
  operationRateLimitGroups?: Record<string, string>;
  routeOperationIds?: Record<string, string>;
}

const buildDataTyped = buildData as BuildData;

export type RateLimitGroup = string;
export type RateLimitUserId = string;
export type RateLimitBucketKey = `${RateLimitGroup}::${RateLimitUserId}`;

export const DEFAULT_RATE_LIMIT_USER_ID = "anonymous";

export const getRateLimitBucketKey = (
  group: RateLimitGroup,
  userId: RateLimitUserId = DEFAULT_RATE_LIMIT_USER_ID,
): RateLimitBucketKey => `${group}::${userId}`;

export interface RateLimitBucketConfig {
  group: RateLimitGroup;
  maxTokens: number;
  windowSize: string;
  windowSeconds: number;
  routeCount: number;
  routeMatchers: string[];
}

export interface RateLimitState {
  bucketKey: RateLimitBucketKey;
  group: RateLimitGroup;
  userId: RateLimitUserId;
  limit: number;
  remaining: number;
  windowSeconds: number;
  retryAfterUntil: number;
  consumedTokens: { timestamp: number; tokens: number }[];
  requestHistory: RateLimitRequestEntry[];
}

export interface RateLimitRequestEntry {
  timestamp: number;
  date: string;
  endpoint: string;
  params: unknown;
  statusCode: number;
  tokenCost: number;
}

const parseWindow = (window: string | undefined): number => {
  if (!window) return 0;
  const match = /^(\d+)([mh])$/.exec(window);
  if (!match?.[1] || !match[2]) return 0;
  const value = Number.parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "m") return value * 60;
  if (unit === "h") return value * 3600;
  return 0;
};

const DEFAULT_BUCKET_WINDOW_SECONDS = 60;

// Returns the first strictly-positive candidate window (in seconds), falling
// back to a sane default. Zero or undefined windows are invalid for rate
// limiting and are skipped rather than used.
const firstPositiveWindowSeconds = (
  ...candidates: (number | undefined)[]
): number => {
  for (const candidate of candidates) {
    if (typeof candidate === "number" && candidate > 0) {
      return candidate;
    }
  }
  return DEFAULT_BUCKET_WINDOW_SECONDS;
};

const routeMatchersByGroup: Record<RateLimitGroup, string[]> = {};

const addRouteMatcher = (group: RateLimitGroup, routeMatcher: string) => {
  const routeMatchers = (routeMatchersByGroup[group] ??= []);

  if (!routeMatchers.includes(routeMatcher)) {
    routeMatchers.push(routeMatcher);
  }
};

for (const [routeKey, operationId] of Object.entries(
  buildDataTyped.routeOperationIds ?? {},
)) {
  const group = buildDataTyped.operationRateLimitGroups?.[operationId];
  if (!group) {
    continue;
  }

  const routeMatcher = `${routeKey}#${operationId}`;

  addRouteMatcher(group, routeMatcher);
}

for (const [operationId, group] of Object.entries(
  buildDataTyped.operationRateLimitGroups ?? {},
)) {
  const routeMatchers = (routeMatchersByGroup[group] ??= []);

  if (routeMatchers.length === 0) {
    routeMatchers.push(`operation:${operationId}`);
  }
}

const RATE_LIMIT_BUCKET_CONFIGS: Record<RateLimitGroup, RateLimitBucketConfig> =
  {};

for (const [group, config] of Object.entries(buildDataTyped.rateLimits ?? {})) {
  const routeMatchers = routeMatchersByGroup[group] ?? [];
  RATE_LIMIT_BUCKET_CONFIGS[group] = {
    group,
    maxTokens: config.maxTokens,
    windowSize: config.windowSize,
    windowSeconds: parseWindow(config.windowSize),
    routeCount: routeMatchers.length,
    routeMatchers,
  };
}

const DEFAULT_REQUEST_HISTORY_WINDOW_SECONDS = 15 * 60;
const LONGEST_RATE_LIMIT_WINDOW_SECONDS = Object.values(
  RATE_LIMIT_BUCKET_CONFIGS,
).reduce(
  (longestWindowSeconds, config) =>
    Math.max(longestWindowSeconds, config.windowSeconds),
  DEFAULT_REQUEST_HISTORY_WINDOW_SECONDS,
);
const LONGEST_RATE_LIMIT_WINDOW_MS = LONGEST_RATE_LIMIT_WINDOW_SECONDS * 1000;

const listeners: ((
  state: Record<RateLimitBucketKey, RateLimitState>,
) => void)[] = [];

const notify = () => {
  listeners.forEach((listener) => listener(rateLimitState));
};

const rateLimitState: Record<RateLimitBucketKey, RateLimitState> = {};

/**
 * Token accounting is plain arithmetic over each bucket's `consumedTokens`
 * ledger: `remaining` is the limit minus whatever the ledger holds inside the
 * sliding window.
 *
 * It used to be kept in a `@tanstack/pacer-lite` rate limiter as well, which
 * can only record one execution at a time, stamped `Date.now()`, and scans its
 * whole history on each one. Every response rebuilt that limiter token by
 * token from the used count in its headers — quadratic work that blocked the
 * main thread ~190 ms per response at 1,000 tokens used and ~2.4 s at 4,000,
 * which one `/market/[typeId]` view (~230 tokens) reaches after a handful of
 * items. Each of those executions also armed a 15-minute timer that was never
 * cleared.
 */
const windowMsOf = (state: RateLimitState) =>
  Math.max(1000, Math.floor(state.windowSeconds * 1000));

/** A ledger entry still counts against the bucket until its window elapses. */
const isInWindow = (timestamp: number, windowMs: number, now: number) =>
  now - timestamp < windowMs;

const tokensInLedger = (consumedTokens: RateLimitState["consumedTokens"]) =>
  consumedTokens.reduce((total, entry) => total + entry.tokens, 0);

const toHeaderValue = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();

  if (Array.isArray(value) && value.length > 0) {
    const first: unknown = value[0];
    if (typeof first === "string" || typeof first === "number") {
      return first.toString();
    }
  }

  return undefined;
};

const getHeader = (
  headers: Record<string, unknown>,
  key: string,
): string | undefined => {
  const normalizedKey = key.toLowerCase();
  for (const [headerKey, headerValue] of Object.entries(headers)) {
    if (headerKey.toLowerCase() === normalizedKey) {
      return toHeaderValue(headerValue);
    }
  }

  return undefined;
};

const releaseConsumedTokens = (
  consumedTokens: RateLimitState["consumedTokens"],
  tokensToRelease: number,
) => {
  let remainingToRelease = Math.max(0, Math.floor(tokensToRelease));

  for (
    let index = consumedTokens.length - 1;
    index >= 0 && remainingToRelease > 0;
    index -= 1
  ) {
    const token = consumedTokens[index];
    if (!token) {
      continue;
    }

    if (token.tokens <= remainingToRelease) {
      remainingToRelease -= token.tokens;
      consumedTokens.splice(index, 1);
      continue;
    }

    token.tokens -= remainingToRelease;
    remainingToRelease = 0;
  }

  return remainingToRelease;
};

const cleanupRequestHistory = (state: RateLimitState, now: number): boolean => {
  const nextRequestHistory = state.requestHistory.filter(
    (requestEntry) =>
      now - requestEntry.timestamp <= LONGEST_RATE_LIMIT_WINDOW_MS,
  );
  const changed = nextRequestHistory.length !== state.requestHistory.length;
  state.requestHistory = nextRequestHistory;

  return changed;
};

/**
 * Drop what has aged out and recompute `remaining` from the ledger. Returns
 * whether anything a subscriber can see changed.
 */
const syncState = (state: RateLimitState, now: number): boolean => {
  let changed = cleanupRequestHistory(state, now);

  const windowMs = windowMsOf(state);
  const nextConsumedTokens = state.consumedTokens.filter((token) =>
    isInWindow(token.timestamp, windowMs, now),
  );
  if (nextConsumedTokens.length !== state.consumedTokens.length) {
    state.consumedTokens = nextConsumedTokens;
    changed = true;
  }

  if (state.retryAfterUntil > 0 && state.retryAfterUntil <= now) {
    state.retryAfterUntil = 0;
    changed = true;
  }

  const remaining = Math.max(
    0,
    state.limit - tokensInLedger(state.consumedTokens),
  );
  if (state.remaining !== remaining) {
    state.remaining = remaining;
    changed = true;
  }

  return changed;
};

const ensureBucketState = (
  group: RateLimitGroup,
  userId: RateLimitUserId,
): RateLimitBucketKey => {
  const bucketKey = getRateLimitBucketKey(group, userId);
  if (rateLimitState[bucketKey]) {
    return bucketKey;
  }

  const config = RATE_LIMIT_BUCKET_CONFIGS[group];
  if (!config) {
    return bucketKey;
  }

  const windowSeconds = config.windowSeconds > 0 ? config.windowSeconds : 60;
  const limit = Math.max(0, config.maxTokens);

  rateLimitState[bucketKey] = {
    bucketKey,
    group,
    userId,
    limit,
    remaining: limit,
    windowSeconds,
    retryAfterUntil: 0,
    consumedTokens: [],
    requestHistory: [],
  };

  return bucketKey;
};

/**
 * Replace a bucket's ledger with what ESI reports. ESI says how much of the
 * window is used, not when, so the used tokens are recorded as one entry
 * stamped now.
 */
const resetStateFromHeaders = (
  group: RateLimitGroup,
  userId: RateLimitUserId,
  limit: number,
  windowSeconds: number,
  remaining: number,
) => {
  const bucketKey = getRateLimitBucketKey(group, userId);
  const existingState = rateLimitState[bucketKey];
  const safeLimit = Math.max(1, Math.floor(limit));
  const safeRemaining = Math.max(0, Math.min(safeLimit, Math.floor(remaining)));
  const used = safeLimit - safeRemaining;
  const now = Date.now();

  const requestHistory = (existingState?.requestHistory ?? []).filter(
    (requestEntry) =>
      now - requestEntry.timestamp <= LONGEST_RATE_LIMIT_WINDOW_MS,
  );

  rateLimitState[bucketKey] = {
    bucketKey,
    group,
    userId,
    limit: safeLimit,
    remaining: safeRemaining,
    windowSeconds: Math.max(1, Math.floor(windowSeconds)),
    retryAfterUntil: 0,
    consumedTokens: used > 0 ? [{ timestamp: now, tokens: used }] : [],
    requestHistory,
  };
};

export const getRateLimitBuildDate = () => buildDataTyped.buildDate;

export const getRateLimitRequestHistoryWindowSeconds = () =>
  LONGEST_RATE_LIMIT_WINDOW_SECONDS;

export const getRateLimitBucketConfigs = () => RATE_LIMIT_BUCKET_CONFIGS;

export const getAllRateLimitGroups = () =>
  Array.from(
    new Set([
      ...Object.keys(RATE_LIMIT_BUCKET_CONFIGS),
      ...Object.values(rateLimitState).map((state) => state.group),
    ]),
  );

export const getRateLimitState = () => rateLimitState;

export const subscribeToRateLimitState = (
  listener: (state: Record<RateLimitBucketKey, RateLimitState>) => void,
) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};

export const updateRateLimitState = (
  group: RateLimitGroup,
  headers: Record<string, unknown>,
  userId: RateLimitUserId = DEFAULT_RATE_LIMIT_USER_ID,
) => {
  const limitHeader = getHeader(headers, "x-ratelimit-limit");
  const remainingHeader = getHeader(headers, "x-ratelimit-remaining");

  if (!limitHeader || !remainingHeader) return false;

  const [limitPart, windowPart] = limitHeader.split("/");
  if (!limitPart) return false;

  const limit = Number.parseInt(limitPart, 10);
  const remaining = Number.parseInt(remainingHeader, 10);
  const parsedWindowSeconds = parseWindow(windowPart);

  if (!Number.isFinite(limit) || !Number.isFinite(remaining) || limit <= 0) {
    return false;
  }

  const bucketKey = getRateLimitBucketKey(group, userId);
  // Pick the first strictly-positive window: header value, then any window we
  // already track for this bucket, then the configured group window, else 60.
  // A zero/undefined window is invalid for rate limiting, so it is skipped.
  const windowSeconds = firstPositiveWindowSeconds(
    parsedWindowSeconds,
    rateLimitState[bucketKey]?.windowSeconds,
    RATE_LIMIT_BUCKET_CONFIGS[group]?.windowSeconds,
  );

  resetStateFromHeaders(group, userId, limit, windowSeconds, remaining);
  notify();
  return true;
};

export const updateRetryAfter = (
  group: RateLimitGroup,
  retryAfterSeconds: number,
  userId: RateLimitUserId = DEFAULT_RATE_LIMIT_USER_ID,
) => {
  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
    return false;
  }

  const bucketKey = ensureBucketState(group, userId);
  const state = rateLimitState[bucketKey];
  if (!state) {
    return false;
  }

  const retryAfterUntil = Date.now() + Math.ceil(retryAfterSeconds * 1000);
  if (retryAfterUntil <= state.retryAfterUntil) {
    return false;
  }

  state.retryAfterUntil = retryAfterUntil;
  notify();
  return true;
};

export const recordRateLimitRequest = (
  group: RateLimitGroup,
  request: {
    endpoint: string;
    params: unknown;
    statusCode: number;
    tokenCost: number;
    timestamp?: number;
  },
  userId: RateLimitUserId = DEFAULT_RATE_LIMIT_USER_ID,
) => {
  if (!request.endpoint || !Number.isFinite(request.statusCode)) {
    return false;
  }

  const safeTimestamp =
    typeof request.timestamp === "number" && Number.isFinite(request.timestamp)
      ? request.timestamp
      : Date.now();
  const bucketKey = ensureBucketState(group, userId);
  const state = rateLimitState[bucketKey];
  if (!state) {
    return false;
  }

  state.requestHistory.push({
    timestamp: safeTimestamp,
    date: new Date(safeTimestamp).toISOString(),
    endpoint: request.endpoint,
    params: request.params,
    statusCode: Math.max(0, Math.floor(request.statusCode)),
    tokenCost: Math.max(0, Math.floor(request.tokenCost)),
  });

  cleanupRequestHistory(state, Date.now());
  notify();
  return true;
};

export const consumeTokens = (
  group: RateLimitGroup,
  tokens: number,
  userId: RateLimitUserId = DEFAULT_RATE_LIMIT_USER_ID,
) => {
  const bucketKey = ensureBucketState(group, userId);
  const state = rateLimitState[bucketKey];

  if (!state || state.limit <= 0 || tokens === 0) return;

  const integerTokens = Math.max(0, Math.floor(Math.abs(tokens)));
  if (integerTokens <= 0) return;

  const now = Date.now();
  let changed = syncState(state, now);

  if (tokens > 0) {
    // Grants at most what the window has left, as the limiter did.
    const granted = Math.min(integerTokens, state.remaining);
    if (granted > 0) {
      state.consumedTokens.push({ timestamp: now, tokens: granted });
      changed = true;
    }
  } else {
    const remainingToRelease = releaseConsumedTokens(
      state.consumedTokens,
      integerTokens,
    );
    if (remainingToRelease !== integerTokens) {
      changed = true;
    }
  }

  if (syncState(state, now) || changed) {
    notify();
  }
};

export const cleanupTokens = () => {
  const now = Date.now();
  let changed = false;
  for (const state of Object.values(rateLimitState)) {
    if (syncState(state, now)) {
      changed = true;
    }
  }
  if (changed) {
    notify();
  }
};

// `setInterval` returns a `number` in browsers but a `NodeJS.Timeout` (with an
// `unref` method) in Node. This guard narrows the handle to the Node shape so
// the Node-only `unref()` call stays type-safe across both environments.
const hasUnref = (value: unknown): value is { unref: () => void } =>
  typeof value === "object" &&
  value !== null &&
  "unref" in value &&
  typeof value.unref === "function";

if (typeof setInterval !== "undefined") {
  const cleanupInterval: unknown = setInterval(cleanupTokens, 1000);

  if (hasUnref(cleanupInterval)) {
    cleanupInterval.unref();
  }
}

export const getWaitTime = (
  group: RateLimitGroup,
  tokensNeeded: number,
  userId: RateLimitUserId = DEFAULT_RATE_LIMIT_USER_ID,
) => {
  if (tokensNeeded <= 0) return 0;

  const bucketKey = ensureBucketState(group, userId);
  const state = rateLimitState[bucketKey];
  if (!state) return 0;

  const now = Date.now();
  syncState(state, now);
  const retryAfterWaitTime = Math.max(0, state.retryAfterUntil - now);

  if (state.remaining >= tokensNeeded) return retryAfterWaitTime;

  const sortedTokens = [...state.consumedTokens].sort(
    (a, b) => a.timestamp - b.timestamp,
  );
  let temporaryRemaining = state.remaining;
  const windowMs = windowMsOf(state);

  for (const token of sortedTokens) {
    temporaryRemaining += token.tokens;
    if (temporaryRemaining >= tokensNeeded) {
      return Math.max(retryAfterWaitTime, token.timestamp + windowMs - now);
    }
  }

  return retryAfterWaitTime;
};
