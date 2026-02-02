import type { AxiosHeaders, AxiosRequestConfig, AxiosResponse } from "axios";
import axios, { AxiosError } from "axios";

import buildData from "./build-data.json";

declare const AXIOS_BASE: string;
declare const AXIOS_HEADERS: string;

/**
 * Subset of AxiosRequestConfig
 */
export type RequestConfig<TData = unknown> = {
  baseURL?: string;
  url?: string;
  method?: "GET" | "PUT" | "PATCH" | "POST" | "DELETE" | "OPTIONS" | "HEAD";
  params?: unknown;
  data?: TData | FormData;
  responseType?:
    | "arraybuffer"
    | "blob"
    | "document"
    | "json"
    | "text"
    | "stream";
  signal?: AbortSignal;
  headers?: AxiosRequestConfig["headers"];
  rateLimit?: RateLimitConfig;
};

export type RateLimitConfig = {
  group?: string;
  windowMs?: number;
  maxTokens?: number;
  applicationId?: string | number;
  characterId?: string | number;
  sourceIp?: string;
  authenticated?: boolean;
  expectedCost?: number;
  wait?: boolean;
  maxWaitMs?: number;
};

type RateLimitDefinition = {
  group: string;
  windowMs: number;
  maxTokens: number;
};

type RateLimitEntry = {
  id: number;
  timestamp: number;
  tokens: number;
};

type RateLimitBucket = {
  group: string;
  userKey: string;
  windowMs: number;
  maxTokens: number;
  usedTokens: number;
  entries: RateLimitEntry[];
  nextFreeAt: number;
};

type RateLimitReservation = {
  bucket: RateLimitBucket;
  entry: RateLimitEntry;
  expectedTokens: number;
};

type RateLimitContext = {
  config: RequestConfig;
  rateLimitConfig: RateLimitConfig;
  routeKey: string | null;
  definition: RateLimitDefinition | null;
  userKey: string | null;
  reservation?: RateLimitReservation;
  expectedTokens: number;
  retryAfterMs?: number;
  hardLimitExceeded?: boolean;
};

type RateLimitGroupMeta = {
  windowMs: number;
  maxTokens: number;
  source: "schema" | "headers" | "config";
  updatedAt: number;
};

type RateLimitCounters = {
  inFlight: number;
  waiting: number;
  totalRequests: number;
  totalCompleted: number;
  totalSucceeded: number;
  totalFailed: number;
  localLimitHits: number;
  serverLimitHits: number;
  statusCounts: {
    "2xx": number;
    "3xx": number;
    "4xx": number;
    "5xx": number;
  };
  totalWaits: number;
  totalWaitMs: number;
  maxWaitMs: number;
  lastRequestAt?: number;
  lastResponseAt?: number;
};

export type RateLimitBucketState = {
  key: string;
  group: string;
  userKey: string;
  windowMs: number;
  maxTokens: number;
  effectiveMaxTokens: number;
  usedTokens: number;
  availableTokens: number;
  entryCount: number;
  nextFreeAt: number;
  nextFreeInMs: number;
  lastRequestAt?: number;
};

export type RateLimitGroupState = {
  group: string;
  windowMs: number;
  maxTokens: number;
  effectiveMaxTokens: number;
  source: "schema" | "headers" | "config";
  updatedAt: number;
};

export type RateLimitStateSnapshot = RateLimitCounters & {
  buckets: RateLimitBucketState[];
  groups: RateLimitGroupState[];
  routeGroups: number;
};

export type RateLimitSchemaEntry = {
  routeKey: string;
  group: string;
  windowMs: number;
  maxTokens: number;
};

/**
 * Subset of AxiosResponse
 */
export type ResponseConfig<TData = unknown> = {
  data: TData;
  status: number;
  statusText: string;
  headers: AxiosResponse["headers"];
};

export type ResponseErrorConfig<TError = unknown> = AxiosError<TError>;

const RATE_LIMIT_SAFETY_FACTOR = 0.9;
const DEFAULT_EXPECTED_COST = 2;
const DEFAULT_WAIT_ON_LIMIT = true;

const RATE_LIMIT_HEADERS = {
  group: "X-Ratelimit-Group",
  limit: "X-Ratelimit-Limit",
  retryAfter: "Retry-After",
} as const;

const ESI_BASE_URL = "https://esi.evetech.net";
const ESI_LATEST_BASE_URL = `${ESI_BASE_URL}/latest`;

const rateLimitBuckets = new Map<string, RateLimitBucket>();
const rateLimitGroups = new Map<string, RateLimitGroupMeta>();
const rateLimitRoutes = new Map<string, string>();
const rateLimitSubscribers = new Set<() => void>();
const rateLimitCounters: RateLimitCounters = {
  inFlight: 0,
  waiting: 0,
  totalRequests: 0,
  totalCompleted: 0,
  totalSucceeded: 0,
  totalFailed: 0,
  localLimitHits: 0,
  serverLimitHits: 0,
  statusCounts: {
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
  },
  totalWaits: 0,
  totalWaitMs: 0,
  maxWaitMs: 0,
};
let rateLimitEntryId = 0;

let _config: Partial<RequestConfig> = {
  baseURL: typeof AXIOS_BASE !== "undefined" ? AXIOS_BASE : undefined,
  headers:
    typeof AXIOS_HEADERS !== "undefined"
      ? (JSON.parse(AXIOS_HEADERS) as AxiosHeaders)
      : undefined,
};

export const getConfig = () => _config;

export const setConfig = (config: RequestConfig) => {
  _config = config;
  return getConfig();
};

export const axiosInstance = axios.create(getConfig());

const notifyRateLimitSubscribers = () => {
  for (const listener of rateLimitSubscribers) {
    listener();
  }
};

export const subscribeRateLimitState = (listener: () => void) => {
  rateLimitSubscribers.add(listener);
  return () => {
    rateLimitSubscribers.delete(listener);
  };
};

const getHeaderValue = (
  headers: AxiosRequestConfig["headers"] | AxiosResponse["headers"] | undefined,
  name: string,
) => {
  if (!headers) return undefined;
  const withGet = headers as { get?: (header: string) => unknown };
  if (typeof withGet.get === "function") {
    const value = withGet.get(name);
    if (Array.isArray(value)) return value.join(",");
    return value == null ? undefined : String(value);
  }
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      if (Array.isArray(value)) return value.join(",");
      return value == null ? undefined : String(value);
    }
  }
  return undefined;
};

const parseRateLimitLimitHeader = (value: string | undefined) => {
  if (!value) return null;
  const match = value.trim().match(/^(\d+)\s*\/\s*(\d+)\s*([mh])$/i);
  if (!match) return null;
  const maxTokens = Number(match[1]);
  const windowCount = Number(match[2]);
  if (!Number.isFinite(maxTokens) || !Number.isFinite(windowCount)) return null;
  if (maxTokens <= 0 || windowCount <= 0) return null;
  const unit = match[3].toLowerCase();
  const windowMs = windowCount * (unit === "h" ? 60 * 60 * 1000 : 60 * 1000);
  return { maxTokens, windowMs };
};

const parseRetryAfterSeconds = (value: string | undefined) => {
  if (!value) return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.ceil(seconds);
};

const stripEsiVersionPrefix = (path: string) => {
  const match = path.match(/^\/(latest|dev|legacy|v\d+)(\/|$)/i);
  if (!match) return path;
  if (!match[0].endsWith("/")) return "/";
  const rest = path.slice(match[0].length - 1);
  return rest || "/";
};

const parseUrlPath = (url: string, baseURL?: string) => {
  try {
    const parsed = new URL(url, baseURL ?? "http://rate-limit.invalid");
    return parsed.pathname;
  } catch {
    return null;
  }
};

const normalizePath = (path: string) =>
  stripEsiVersionPrefix(path)
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      if (/^\{.+\}$/.test(segment)) return "{id}";
      if (/^\d+$/.test(segment)) return "{id}";
      if (/^[0-9a-f-]{16,}$/i.test(segment)) return "{id}";
      return segment;
    })
    .join("/");

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

const ensureTrailingSlash = (value: string) => {
  const [path, query] = value.split("?");
  if (path.endsWith("/")) return value;
  const withSlash = `${path}/`;
  return query ? `${withSlash}?${query}` : withSlash;
};

const normalizeEsiUrl = (value: string) => {
  if (!value.startsWith(ESI_BASE_URL)) return value;
  let url = value;
  if (!url.startsWith(ESI_LATEST_BASE_URL)) {
    const rest = url.slice(ESI_BASE_URL.length);
    url = `${ESI_LATEST_BASE_URL}${rest.startsWith("/") ? "" : "/"}${rest}`;
  }
  return ensureTrailingSlash(url);
};

const normalizeEsiRequestConfig = (config: RequestConfig): RequestConfig => {
  if (!config.url) return config;
  if (isAbsoluteUrl(config.url)) {
    const normalizedUrl = normalizeEsiUrl(config.url);
    if (normalizedUrl === config.url) return config;
    return { ...config, url: normalizedUrl };
  }
  if (config.baseURL && config.baseURL.startsWith(ESI_BASE_URL)) {
    const normalizedBase = normalizeEsiUrl(config.baseURL);
    const normalizedUrl = ensureTrailingSlash(config.url);
    return {
      ...config,
      baseURL: normalizedBase,
      url: normalizedUrl,
    };
  }
  return config;
};

const getRouteKey = (
  config: Pick<RequestConfig, "method" | "url" | "baseURL">,
) => {
  if (!config.url) return null;
  const path = parseUrlPath(config.url, config.baseURL);
  if (!path) return null;
  const method = config.method?.toUpperCase() ?? "GET";
  return `${method} ${normalizePath(path)}`;
};

export const getRateLimitRouteKey = (method: string, path: string) =>
  `${method.toUpperCase()} ${normalizePath(path)}`;

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  if (typeof atob === "function") {
    return atob(padded);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }
  return null;
};

const decodeJwtPayload = (token: string) => {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const decoded = decodeBase64Url(parts[1]);
  if (!decoded) return null;
  try {
    return JSON.parse(decoded) as { sub?: string };
  } catch {
    return null;
  }
};

const extractCharacterIdFromAuthHeader = (authHeader?: string) => {
  if (!authHeader) return undefined;
  const [scheme, token] = authHeader.trim().split(/\s+/);
  if (!token || scheme.toLowerCase() !== "bearer") return undefined;
  const payload = decodeJwtPayload(token);
  const subject = payload?.sub;
  if (!subject) return undefined;
  const parts = subject.split(":");
  if (parts.length < 3) return undefined;
  return parts[2];
};

const extractCharacterIdFromUrl = (
  url: string | undefined,
  baseURL?: string,
) => {
  if (!url) return undefined;
  const path = parseUrlPath(url, baseURL);
  if (!path) return undefined;
  const match = path.match(/\/characters\/(\d+)(?:\/|$)/);
  return match?.[1];
};

const resolveApplicationId = (
  rateLimitConfig: RateLimitConfig,
  headers: AxiosRequestConfig["headers"] | undefined,
) =>
  rateLimitConfig.applicationId ??
  getHeaderValue(headers, "X-Application-Id") ??
  "unknown-app";

const resolveRateLimitUserKey = (
  rateLimitConfig: RateLimitConfig,
  headers: AxiosRequestConfig["headers"] | undefined,
  url: string | undefined,
  baseURL?: string,
) => {
  const applicationId = resolveApplicationId(rateLimitConfig, headers);
  const authHeader = getHeaderValue(headers, "Authorization");
  const isAuthenticated =
    rateLimitConfig.authenticated ?? Boolean(authHeader?.length);
  if (isAuthenticated) {
    const characterId =
      rateLimitConfig.characterId ??
      extractCharacterIdFromUrl(url, baseURL) ??
      extractCharacterIdFromAuthHeader(authHeader) ??
      "unknown-character";
    return `app:${applicationId}|char:${characterId}`;
  }
  const sourceIp = rateLimitConfig.sourceIp ?? "unknown-ip";
  return `app:${applicationId}|ip:${sourceIp}`;
};

const resolveRateLimitDefinition = (
  rateLimitConfig: RateLimitConfig,
  routeKey: string | null,
) => {
  if (
    rateLimitConfig.group &&
    rateLimitConfig.windowMs &&
    rateLimitConfig.maxTokens
  ) {
    return {
      group: rateLimitConfig.group,
      windowMs: rateLimitConfig.windowMs,
      maxTokens: rateLimitConfig.maxTokens,
    };
  }

  const group =
    rateLimitConfig.group ?? (routeKey ? rateLimitRoutes.get(routeKey) : undefined);
  if (!group) return null;

  const limits =
    (() => {
      const meta = rateLimitGroups.get(group);
      return meta ? { windowMs: meta.windowMs, maxTokens: meta.maxTokens } : null;
    })() ?? null;

  if (!limits) return null;
  return { group, windowMs: limits.windowMs, maxTokens: limits.maxTokens };
};

const getBucketKey = (group: string, userKey: string) => `${group}::${userKey}`;

const getEffectiveMaxTokens = (maxTokens: number) =>
  Math.max(1, Math.floor(maxTokens * RATE_LIMIT_SAFETY_FACTOR));

const pruneBucket = (bucket: RateLimitBucket, now: number) => {
  const cutoff = now - bucket.windowMs;
  while (bucket.entries.length > 0 && bucket.entries[0].timestamp <= cutoff) {
    const [expired] = bucket.entries.splice(0, 1);
    bucket.usedTokens -= expired.tokens;
  }
};

const getOrCreateBucket = (
  group: string,
  userKey: string,
  windowMs: number,
  maxTokens: number,
) => {
  const key = getBucketKey(group, userKey);
  const existing = rateLimitBuckets.get(key);
  if (existing) {
    existing.windowMs = windowMs;
    existing.maxTokens = maxTokens;
    return existing;
  }
  const bucket: RateLimitBucket = {
    group,
    userKey,
    windowMs,
    maxTokens,
    usedTokens: 0,
    entries: [],
    nextFreeAt: 0,
  };
  rateLimitBuckets.set(key, bucket);
  return bucket;
};

const reserveTokens = (
  bucket: RateLimitBucket,
  expectedTokens: number,
  now: number,
) => {
  if (expectedTokens <= 0) return { reservation: undefined };
  if (bucket.windowMs <= 0 || bucket.maxTokens <= 0) {
    return { reservation: undefined };
  }

  pruneBucket(bucket, now);

  const effectiveMaxTokens = getEffectiveMaxTokens(bucket.maxTokens);
  const available = effectiveMaxTokens - bucket.usedTokens;
  let retryAt = now;

  if (available < expectedTokens) {
    let needed = expectedTokens - available;
    let freed = 0;
    for (const entry of bucket.entries) {
      freed += entry.tokens;
      if (freed >= needed) {
        retryAt = Math.max(retryAt, entry.timestamp + bucket.windowMs);
        break;
      }
    }
  }

  const spacingMs =
    bucket.windowMs > 0
      ? (expectedTokens / effectiveMaxTokens) * bucket.windowMs
      : 0;
  const spacingAt = Math.max(bucket.nextFreeAt, now);
  retryAt = Math.max(retryAt, spacingAt);

  if (retryAt > now) {
    return { retryAfterMs: retryAt - now };
  }

  const entry: RateLimitEntry = {
    id: (rateLimitEntryId += 1),
    timestamp: now,
    tokens: expectedTokens,
  };
  bucket.entries.push(entry);
  bucket.usedTokens += expectedTokens;
  bucket.nextFreeAt = Math.max(bucket.nextFreeAt, now) + spacingMs;
  return { reservation: { bucket, entry, expectedTokens } };
};

const adjustReservation = (
  reservation: RateLimitReservation,
  actualTokens: number,
  now: number,
) => {
  const bucket = reservation.bucket;
  const entry = reservation.entry;
  const delta = actualTokens - entry.tokens;
  if (delta === 0) return;
  entry.tokens = actualTokens;
  bucket.usedTokens += delta;

  const effectiveMaxTokens = getEffectiveMaxTokens(bucket.maxTokens);
  const spacingDelta =
    bucket.windowMs > 0 ? (delta / effectiveMaxTokens) * bucket.windowMs : 0;
  bucket.nextFreeAt = Math.max(now, bucket.nextFreeAt + spacingDelta);
};

const recordUsage = (bucket: RateLimitBucket, tokens: number, now: number) => {
  if (tokens <= 0) return;
  const entry: RateLimitEntry = {
    id: (rateLimitEntryId += 1),
    timestamp: now,
    tokens,
  };
  bucket.entries.push(entry);
  bucket.usedTokens += tokens;

  const effectiveMaxTokens = getEffectiveMaxTokens(bucket.maxTokens);
  const spacingMs =
    bucket.windowMs > 0 ? (tokens / effectiveMaxTokens) * bucket.windowMs : 0;
  bucket.nextFreeAt = Math.max(bucket.nextFreeAt, now) + spacingMs;
};

const recordRequestInitiated = () => {
  rateLimitCounters.totalRequests += 1;
  rateLimitCounters.lastRequestAt = Date.now();
  notifyRateLimitSubscribers();
};

const recordRequestStart = () => {
  rateLimitCounters.inFlight += 1;
  notifyRateLimitSubscribers();
};

const recordRequestEnd = () => {
  rateLimitCounters.inFlight = Math.max(0, rateLimitCounters.inFlight - 1);
  notifyRateLimitSubscribers();
};

const recordRequestWaitStart = (delayMs: number) => {
  rateLimitCounters.waiting += 1;
  rateLimitCounters.totalWaits += 1;
  rateLimitCounters.totalWaitMs += delayMs;
  rateLimitCounters.maxWaitMs = Math.max(rateLimitCounters.maxWaitMs, delayMs);
  notifyRateLimitSubscribers();
};

const recordRequestWaitEnd = () => {
  rateLimitCounters.waiting = Math.max(0, rateLimitCounters.waiting - 1);
  notifyRateLimitSubscribers();
};

const recordRequestOutcome = (
  status?: number,
  options?: { localLimit?: boolean },
) => {
  rateLimitCounters.totalCompleted += 1;
  rateLimitCounters.lastResponseAt = Date.now();
  if (status == null) {
    rateLimitCounters.totalFailed += 1;
    notifyRateLimitSubscribers();
    return;
  }

  if (status >= 200 && status < 300) {
    rateLimitCounters.statusCounts["2xx"] += 1;
    rateLimitCounters.totalSucceeded += 1;
  } else if (status >= 300 && status < 400) {
    rateLimitCounters.statusCounts["3xx"] += 1;
    rateLimitCounters.totalSucceeded += 1;
  } else if (status >= 400 && status < 500) {
    rateLimitCounters.statusCounts["4xx"] += 1;
    rateLimitCounters.totalFailed += 1;
    if (status === 429) {
      if (options?.localLimit) {
        rateLimitCounters.localLimitHits += 1;
      } else {
        rateLimitCounters.serverLimitHits += 1;
      }
    }
  } else if (status >= 500) {
    rateLimitCounters.statusCounts["5xx"] += 1;
    rateLimitCounters.totalFailed += 1;
  } else {
    rateLimitCounters.totalFailed += 1;
  }

  notifyRateLimitSubscribers();
};

export const getRateLimitState = (): RateLimitStateSnapshot => {
  const now = Date.now();
  const buckets: RateLimitBucketState[] = [];
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    pruneBucket(bucket, now);
    const effectiveMaxTokens = getEffectiveMaxTokens(bucket.maxTokens);
    const availableTokens = Math.max(0, effectiveMaxTokens - bucket.usedTokens);
    const lastRequestAt = bucket.entries[bucket.entries.length - 1]?.timestamp;
    buckets.push({
      key,
      group: bucket.group,
      userKey: bucket.userKey,
      windowMs: bucket.windowMs,
      maxTokens: bucket.maxTokens,
      effectiveMaxTokens,
      usedTokens: bucket.usedTokens,
      availableTokens,
      entryCount: bucket.entries.length,
      nextFreeAt: bucket.nextFreeAt,
      nextFreeInMs: Math.max(0, bucket.nextFreeAt - now),
      lastRequestAt,
    });
  }

  const groups: RateLimitGroupState[] = [];
  for (const [group, meta] of rateLimitGroups.entries()) {
    groups.push({
      group,
      windowMs: meta.windowMs,
      maxTokens: meta.maxTokens,
      effectiveMaxTokens: getEffectiveMaxTokens(meta.maxTokens),
      source: meta.source,
      updatedAt: meta.updatedAt,
    });
  }

  return {
    ...rateLimitCounters,
    buckets,
    groups,
    routeGroups: rateLimitRoutes.size,
  };
};

export const registerRateLimitConfig = (entries: RateLimitSchemaEntry[]) => {
  const now = Date.now();
  for (const entry of entries) {
    rateLimitRoutes.set(entry.routeKey, entry.group);
    const existing = rateLimitGroups.get(entry.group);
    if (!existing || existing.source !== "headers") {
      rateLimitGroups.set(entry.group, {
        windowMs: entry.windowMs,
        maxTokens: entry.maxTokens,
        source: "schema",
        updatedAt: now,
      });
    }
  }
  notifyRateLimitSubscribers();
};

const getTokenCostForStatus = (status: number) => {
  if (status >= 200 && status < 300) return 2;
  if (status >= 300 && status < 400) return 1;
  if (status >= 400 && status < 500) return status === 429 ? 0 : 5;
  return 0;
};

const applyServerRetryAfter = (
  bucket: RateLimitBucket,
  headers: AxiosResponse["headers"],
  now: number,
) => {
  const retryAfterSeconds = parseRetryAfterSeconds(
    getHeaderValue(headers, RATE_LIMIT_HEADERS.retryAfter),
  );
  if (!retryAfterSeconds) return;
  bucket.nextFreeAt = Math.max(bucket.nextFreeAt, now + retryAfterSeconds * 1000);
};

const updateRateLimitCaches = (
  headers: AxiosResponse["headers"],
  routeKey: string | null,
) => {
  const now = Date.now();
  const group = getHeaderValue(headers, RATE_LIMIT_HEADERS.group);
  const limits = parseRateLimitLimitHeader(
    getHeaderValue(headers, RATE_LIMIT_HEADERS.limit),
  );

  if (group && limits) {
    rateLimitGroups.set(group, {
      ...limits,
      source: "headers",
      updatedAt: now,
    });
  }
  if (group && routeKey) {
    rateLimitRoutes.set(routeKey, group);
  }

  return { group, limits };
};

const buildRateLimitError = (
  retryAfterMs: number,
  config: RequestConfig,
  group?: string,
) => {
  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  const headers: Record<string, string> = {
    [RATE_LIMIT_HEADERS.retryAfter]: String(retryAfterSeconds),
  };
  if (group) {
    headers[RATE_LIMIT_HEADERS.group] = group;
  }
  const response: ResponseConfig<{ error: string }> = {
    data: { error: "Rate limit exceeded" },
    status: 429,
    statusText: "Too Many Requests",
    headers,
  };
  return new AxiosError(
    "Rate limit exceeded",
    "ERR_BAD_REQUEST",
    config as AxiosRequestConfig,
    undefined,
    response as AxiosResponse,
  );
};

const createAbortError = (config: RequestConfig) =>
  new AxiosError(
    "Request aborted",
    "ERR_CANCELED",
    config as AxiosRequestConfig,
  );

const waitForRateLimit = (delayMs: number, config: RequestConfig) =>
  new Promise<void>((resolve, reject) => {
    if (delayMs <= 0) {
      resolve();
      return;
    }
    const signal = config.signal;
    if (!signal) {
      setTimeout(resolve, delayMs);
      return;
    }
    if (signal.aborted) {
      reject(createAbortError(config));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(createAbortError(config));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    signal.addEventListener("abort", onAbort, { once: true });
  });

const createRateLimitContext = (
  config: RequestConfig,
  rateLimitConfig: RateLimitConfig,
): RateLimitContext => {
  const now = Date.now();
  const routeKey = getRouteKey(config);
  if (
    rateLimitConfig.group &&
    rateLimitConfig.windowMs &&
    rateLimitConfig.maxTokens
  ) {
    const existing = rateLimitGroups.get(rateLimitConfig.group);
    if (!existing || existing.source !== "headers") {
      rateLimitGroups.set(rateLimitConfig.group, {
        windowMs: rateLimitConfig.windowMs,
        maxTokens: rateLimitConfig.maxTokens,
        source: "config",
        updatedAt: now,
      });
    }
    if (routeKey) {
      rateLimitRoutes.set(routeKey, rateLimitConfig.group);
    }
  }

  const definition = resolveRateLimitDefinition(rateLimitConfig, routeKey);
  const expectedTokens = Math.max(
    0,
    rateLimitConfig.expectedCost ?? DEFAULT_EXPECTED_COST,
  );
  let userKey: string | null = null;
  let reservation: RateLimitReservation | undefined;
  let retryAfterMs: number | undefined;
  let hardLimitExceeded: boolean | undefined;

  if (definition) {
    const effectiveMaxTokens = getEffectiveMaxTokens(definition.maxTokens);
    if (expectedTokens > effectiveMaxTokens) {
      hardLimitExceeded = true;
      retryAfterMs = definition.windowMs;
    } else {
      userKey = resolveRateLimitUserKey(
        rateLimitConfig,
        config.headers,
        config.url,
        config.baseURL,
      );
      if (userKey) {
        const bucket = getOrCreateBucket(
          definition.group,
          userKey,
          definition.windowMs,
          definition.maxTokens,
        );
        const reservationResult = reserveTokens(
          bucket,
          expectedTokens,
          Date.now(),
        );
        reservation = reservationResult.reservation;
        retryAfterMs = reservationResult.retryAfterMs;
      }
    }
  }

  return {
    config,
    rateLimitConfig,
    routeKey,
    definition,
    userKey,
    reservation,
    expectedTokens,
    retryAfterMs,
    hardLimitExceeded,
  };
};

const applyRateLimitResponse = (
  context: RateLimitContext,
  response?: ResponseConfig,
) => {
  if (!response) {
    if (context.reservation) {
      adjustReservation(context.reservation, 0, Date.now());
    }
    return;
  }

  const now = Date.now();
  const { group, limits } = updateRateLimitCaches(
    response.headers,
    context.routeKey,
  );
  const resolvedGroup = group ?? context.definition?.group;
  if (!resolvedGroup) return;

  const actualTokens = getTokenCostForStatus(response.status);
  if (
    context.reservation &&
    context.reservation.bucket.group === resolvedGroup
  ) {
    const resolvedLimits =
      limits ??
      (() => {
        const meta = rateLimitGroups.get(resolvedGroup);
        return meta ? { windowMs: meta.windowMs, maxTokens: meta.maxTokens } : null;
      })();
    if (resolvedLimits) {
      context.reservation.bucket.windowMs = resolvedLimits.windowMs;
      context.reservation.bucket.maxTokens = resolvedLimits.maxTokens;
    }
    adjustReservation(context.reservation, actualTokens, now);
  } else {
    const resolvedLimits =
      limits ??
      (() => {
        const meta = rateLimitGroups.get(resolvedGroup);
        return meta ? { windowMs: meta.windowMs, maxTokens: meta.maxTokens } : null;
      })();
    if (!resolvedLimits) return;

    const userKey =
      context.userKey ??
      resolveRateLimitUserKey(
        context.rateLimitConfig,
        context.config.headers,
        context.config.url,
        context.config.baseURL,
      );
    if (!userKey) return;

    if (context.reservation) {
      adjustReservation(context.reservation, 0, now);
    }
    const bucket = getOrCreateBucket(
      resolvedGroup,
      userKey,
      resolvedLimits.windowMs,
      resolvedLimits.maxTokens,
    );
    recordUsage(bucket, actualTokens, now);
    if (response.status === 429) {
      applyServerRetryAfter(bucket, response.headers, now);
    }
  }

  if (
    response.status === 429 &&
    context.reservation &&
    context.reservation.bucket.group === resolvedGroup
  ) {
    applyServerRetryAfter(context.reservation.bucket, response.headers, now);
  }
};

export const client = async <TData, TError = unknown, TVariables = unknown>(
  config: RequestConfig<TVariables>,
): Promise<ResponseConfig<TData>> => {
  const globalConfig = getConfig();
  const { rateLimit: globalRateLimit, headers: globalHeaders, ...baseConfig } =
    globalConfig;
  const {
    rateLimit: requestRateLimit,
    headers: requestHeaders,
    ...requestConfig
  } = config;
  const mergedRateLimit: RateLimitConfig = {
    ...(globalRateLimit ?? {}),
    ...(requestRateLimit ?? {}),
  };

  const axiosConfig: RequestConfig<TVariables> = {
    ...baseConfig,
    ...requestConfig,
    headers: {
      "X-Compatibility-Date": buildData.buildDate,
      "X-User-Agent":
        "jitaspace-esi-client/1.0.0 (joao@jita.space) (eve:Joao Neto)",
      ...globalHeaders,
      ...requestHeaders,
    },
  };
  const requestConfigFinal = normalizeEsiRequestConfig(axiosConfig);

  recordRequestInitiated();

  const waitEnabled = mergedRateLimit.wait ?? DEFAULT_WAIT_ON_LIMIT;
  const maxWaitMs = mergedRateLimit.maxWaitMs;
  let waitedMs = 0;
  let rateLimitContext = createRateLimitContext(axiosConfig, mergedRateLimit);

  while (rateLimitContext.retryAfterMs != null) {
    const retryAfterMs = rateLimitContext.retryAfterMs;
    const shouldWait =
      waitEnabled && !rateLimitContext.hardLimitExceeded && retryAfterMs > 0;
    if (!shouldWait) {
      recordRequestOutcome(429, { localLimit: true });
      throw buildRateLimitError(
        retryAfterMs,
        requestConfigFinal,
        rateLimitContext.definition?.group,
      );
    }
    if (maxWaitMs != null && waitedMs + retryAfterMs > maxWaitMs) {
      recordRequestOutcome(429, { localLimit: true });
      throw buildRateLimitError(
        retryAfterMs,
        requestConfigFinal,
        rateLimitContext.definition?.group,
      );
    }

    recordRequestWaitStart(retryAfterMs);
    try {
      await waitForRateLimit(retryAfterMs, requestConfigFinal);
    } catch (error) {
      recordRequestWaitEnd();
      recordRequestOutcome(undefined);
      throw error;
    }
    recordRequestWaitEnd();
    waitedMs += retryAfterMs;
    rateLimitContext = createRateLimitContext(axiosConfig, mergedRateLimit);
  }

  recordRequestStart();

  try {
    const response = await axiosInstance.request<TData, ResponseConfig<TData>>(
      requestConfigFinal,
    );
    applyRateLimitResponse(rateLimitContext, response);
    recordRequestOutcome(response.status);
    return response;
  } catch (e) {
    const error = e as AxiosError<TError>;
    applyRateLimitResponse(rateLimitContext, error.response);
    recordRequestOutcome(error.response?.status);
    throw error;
  } finally {
    recordRequestEnd();
  }
};

client.getConfig = getConfig;
client.setConfig = setConfig;

export default client;
