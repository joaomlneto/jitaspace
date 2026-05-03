import { LiteRateLimiter } from "@tanstack/pacer-lite/lite-rate-limiter";

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
  routeRateLimitGroups?: Record<string, string>;
}

const buildDataTyped = buildData as BuildData;

export type RateLimitGroup = string;
export type RateLimitUserId = string;
export type RateLimitBucketKey = `${RateLimitGroup}::${RateLimitUserId}`;

export const DEFAULT_RATE_LIMIT_USER_ID = "anonymous";

export const getRateLimitBucketKey = (
  group: RateLimitGroup,
  userId: RateLimitUserId = DEFAULT_RATE_LIMIT_USER_ID,
) => `${group}::${userId}` as RateLimitBucketKey;

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
  const match = window.match(/^(\d+)([mh])$/);
  if (!match || !match[1] || !match[2]) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === "m") return value * 60;
  if (unit === "h") return value * 3600;
  return 0;
};

const routeMatchersByGroup: Record<RateLimitGroup, string[]> = {};

const addRouteMatcher = (group: RateLimitGroup, routeMatcher: string) => {
  if (!routeMatchersByGroup[group]) {
    routeMatchersByGroup[group] = [];
  }

  if (!routeMatchersByGroup[group].includes(routeMatcher)) {
    routeMatchersByGroup[group].push(routeMatcher);
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

for (const [routeKey, group] of Object.entries(
  buildDataTyped.routeRateLimitGroups ?? {},
)) {
  addRouteMatcher(group, routeKey);
}

for (const [operationId, group] of Object.entries(
  buildDataTyped.operationRateLimitGroups ?? {},
)) {
  if (!routeMatchersByGroup[group]) {
    routeMatchersByGroup[group] = [];
  }

  if (routeMatchersByGroup[group].length === 0) {
    routeMatchersByGroup[group].push(`operation:${operationId}`);
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

const createRuntime = (limit: number, windowSeconds: number) => {
  const safeLimit = Math.max(1, Math.floor(limit));
  const safeWindowMs = Math.max(1000, Math.floor(windowSeconds * 1000));

  return {
    limiter: new LiteRateLimiter(() => {}, {
      limit: safeLimit,
      window: safeWindowMs,
      windowType: "sliding",
    }),
    limit: safeLimit,
    windowSeconds: Math.max(1, Math.floor(safeWindowMs / 1000)),
    windowMs: safeWindowMs,
  };
};

type RateLimitRuntime = ReturnType<typeof createRuntime>;

const rateLimitRuntimes: Record<RateLimitBucketKey, RateLimitRuntime> = {};

let rateLimitState: Record<RateLimitBucketKey, RateLimitState> = {};

const toHeaderValue = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();

  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
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

const getRuntimeRemaining = (runtime: RateLimitRuntime) =>
  Math.max(0, Math.min(runtime.limit, runtime.limiter.getRemainingInWindow()));

const executeRuntimeTokens = (runtime: RateLimitRuntime, tokens: number) => {
  const integerTokens = Math.max(0, Math.floor(tokens));
  let executed = 0;

  for (; executed < integerTokens; executed += 1) {
    if (!runtime.limiter.maybeExecute()) {
      break;
    }
  }

  return executed;
};

const createConsumedTokens = (
  count: number,
  timestamp: number,
): RateLimitState["consumedTokens"] =>
  Array.from({ length: count }, () => ({ timestamp, tokens: 1 }));

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

const cleanupState = (
  state: RateLimitState,
  windowMs: number,
  now: number,
): boolean => {
  let changed = cleanupRequestHistory(state, now);

  const nextConsumedTokens = state.consumedTokens.filter(
    (token) => now - token.timestamp <= windowMs,
  );
  if (nextConsumedTokens.length !== state.consumedTokens.length) {
    state.consumedTokens = nextConsumedTokens;
    changed = true;
  }

  if (state.retryAfterUntil > 0 && state.retryAfterUntil <= now) {
    state.retryAfterUntil = 0;
    changed = true;
  }

  return changed;
};

const applyRuntimeToState = (
  state: RateLimitState,
  runtime: RateLimitRuntime,
): boolean => {
  const remaining = getRuntimeRemaining(runtime);
  const changed =
    state.limit !== runtime.limit ||
    state.windowSeconds !== runtime.windowSeconds ||
    state.remaining !== remaining;

  state.limit = runtime.limit;
  state.windowSeconds = runtime.windowSeconds;
  state.remaining = remaining;

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

  if (limit > 0 && windowSeconds > 0) {
    rateLimitRuntimes[bucketKey] = createRuntime(limit, windowSeconds);
  }

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

const syncStateWithRuntime = (bucketKey: RateLimitBucketKey): boolean => {
  const state = rateLimitState[bucketKey];
  const runtime = rateLimitRuntimes[bucketKey];
  if (!state || !runtime) return false;

  const now = Date.now();
  const stateCleaned = cleanupState(state, runtime.windowMs, now);
  const runtimeApplied = applyRuntimeToState(state, runtime);

  return stateCleaned || runtimeApplied;
};

const rebuildRuntimeFromState = (
  bucketKey: RateLimitBucketKey,
  now: number = Date.now(),
): boolean => {
  const state = rateLimitState[bucketKey];
  if (!state) return false;

  const runtime = createRuntime(state.limit, state.windowSeconds);
  rateLimitRuntimes[bucketKey] = runtime;

  const stateCleaned = cleanupState(state, runtime.windowMs, now);

  const sortedTokens = [...state.consumedTokens].sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  for (const token of sortedTokens) {
    executeRuntimeTokens(runtime, token.tokens);
  }

  const runtimeApplied = applyRuntimeToState(state, runtime);

  return stateCleaned || runtimeApplied;
};

const resetRuntimeFromHeaders = (
  group: RateLimitGroup,
  userId: RateLimitUserId,
  limit: number,
  windowSeconds: number,
  remaining: number,
) => {
  const bucketKey = getRateLimitBucketKey(group, userId);
  const existingState = rateLimitState[bucketKey];
  const runtime = createRuntime(limit, windowSeconds);
  rateLimitRuntimes[bucketKey] = runtime;

  const safeRemaining = Math.max(0, Math.min(runtime.limit, remaining));
  const used = Math.max(0, runtime.limit - safeRemaining);
  const now = Date.now();
  const consumedTokens = createConsumedTokens(
    executeRuntimeTokens(runtime, used),
    now,
  );

  const requestHistory = (existingState?.requestHistory ?? []).filter(
    (requestEntry) =>
      now - requestEntry.timestamp <= LONGEST_RATE_LIMIT_WINDOW_MS,
  );

  rateLimitState[bucketKey] = {
    bucketKey,
    group,
    userId,
    limit: runtime.limit,
    remaining: getRuntimeRemaining(runtime),
    windowSeconds: runtime.windowSeconds,
    retryAfterUntil: 0,
    consumedTokens,
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

  const limit = parseInt(limitPart, 10);
  const remaining = parseInt(remainingHeader, 10);
  const parsedWindowSeconds = parseWindow(windowPart);

  if (!Number.isFinite(limit) || !Number.isFinite(remaining) || limit <= 0) {
    return false;
  }

  const bucketKey = getRateLimitBucketKey(group, userId);
  const fallbackWindowSeconds =
    rateLimitState[bucketKey]?.windowSeconds ||
    RATE_LIMIT_BUCKET_CONFIGS[group]?.windowSeconds ||
    60;
  const windowSeconds =
    parsedWindowSeconds > 0 ? parsedWindowSeconds : fallbackWindowSeconds;

  resetRuntimeFromHeaders(group, userId, limit, windowSeconds, remaining);
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
  const runtime = rateLimitRuntimes[bucketKey];

  if (!state || !runtime || tokens === 0) return;

  const integerTokens = Math.max(0, Math.floor(Math.abs(tokens)));
  if (integerTokens <= 0) return;

  let consumedOrReleased = false;
  const now = Date.now();

  if (tokens > 0) {
    const consumed = executeRuntimeTokens(runtime, integerTokens);
    if (consumed > 0) {
      state.consumedTokens.push(...createConsumedTokens(consumed, now));
      consumedOrReleased = true;
    }
  } else {
    const remainingToRelease = releaseConsumedTokens(
      state.consumedTokens,
      integerTokens,
    );
    consumedOrReleased = remainingToRelease !== integerTokens;
  }

  const stateChanged =
    tokens > 0
      ? syncStateWithRuntime(bucketKey)
      : rebuildRuntimeFromState(bucketKey, now);

  if (consumedOrReleased || stateChanged) {
    notify();
  }
};

export const cleanupTokens = () => {
  let changed = false;
  for (const bucketKey of Object.keys(rateLimitState) as RateLimitBucketKey[]) {
    if (syncStateWithRuntime(bucketKey)) {
      changed = true;
    }
  }
  if (changed) {
    notify();
  }
};

if (typeof setInterval !== "undefined") {
  const cleanupInterval = setInterval(cleanupTokens, 1000);

  if (
    typeof cleanupInterval === "object" &&
    cleanupInterval !== null &&
    "unref" in cleanupInterval &&
    typeof cleanupInterval.unref === "function"
  ) {
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

  syncStateWithRuntime(bucketKey);

  const now = Date.now();
  const retryAfterWaitTime = Math.max(0, state.retryAfterUntil - now);

  if (state.remaining >= tokensNeeded) return retryAfterWaitTime;

  const sortedTokens = [...state.consumedTokens].sort(
    (a, b) => a.timestamp - b.timestamp,
  );
  let temporaryRemaining = state.remaining;
  const windowMs = state.windowSeconds * 1000;

  for (const token of sortedTokens) {
    temporaryRemaining += token.tokens;
    if (temporaryRemaining >= tokensNeeded) {
      return Math.max(retryAfterWaitTime, token.timestamp + windowMs - now);
    }
  }

  return retryAfterWaitTime;
};
