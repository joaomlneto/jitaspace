import type { AxiosError, AxiosHeaders, AxiosRequestConfig, AxiosResponse } from "axios";
import axios from "axios";

import buildData from "./build-data.json";
import {
  consumeTokens,
  getWaitTime,
  recordRateLimitRequest,
  updateRateLimitState,
  updateRetryAfter
} from "./rate-limit";

declare const AXIOS_BASE: string;
declare const AXIOS_HEADERS: string;

/**
 * Subset of AxiosRequestConfig
 */
export type RequestConfig<TData = unknown> = {
  baseURL?: string;
  url?: string;
  method?: "GET" | "PUT" | "PATCH" | "POST" | "DELETE" | "OPTIONS" | "HEAD";
  operationId?: string;
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
  rateLimitUserId?: string;
  userAgent?: string;
  acceptLanguage?: string;
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

const mergeHeaders = (
  currentHeaders: AxiosRequestConfig["headers"],
  nextHeaders: AxiosRequestConfig["headers"],
): AxiosRequestConfig["headers"] => {
  if (!nextHeaders) {
    return currentHeaders;
  }

  if (!currentHeaders) {
    return nextHeaders;
  }

  return {
    ...(currentHeaders as Record<string, unknown>),
    ...(nextHeaders as Record<string, unknown>),
  } as AxiosRequestConfig["headers"];
};

export const updateConfig = (config: Partial<RequestConfig>) => {
  _config = {
    ..._config,
    ...config,
    headers: mergeHeaders(_config.headers, config.headers),
  };

  return getConfig();
};

export const setUserAgent = (userAgent?: string) => updateConfig({ userAgent });

export const setAcceptLanguage = (acceptLanguage?: string) =>
  updateConfig({ acceptLanguage });

export const axiosInstance = axios.create(getConfig());

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface BuildData {
  operationRateLimitGroups?: Record<string, string>;
  routeOperationIds?: Record<string, string>;
  routeRateLimitGroups?: Record<string, string>;
}

interface RouteOperationMapping {
  method: string;
  pathSegments: string[];
  operationId: string;
  specificity: number;
}

interface RouteGroupMapping {
  method: string;
  routeRegex: RegExp;
  group: string;
}

const buildDataTyped = buildData as BuildData;

const normalizeRoutePath = (path: string): string => {
  if (!path) {
    return "/";
  }

  let normalizedPath = path;
  if (!normalizedPath.startsWith("/")) {
    normalizedPath = `/${normalizedPath}`;
  }

  if (normalizedPath.length > 1 && normalizedPath.endsWith("/")) {
    return normalizedPath.slice(0, -1);
  }

  return normalizedPath;
};

const getPathSegments = (path: string): string[] =>
  normalizeRoutePath(path)
    .split("/")
    .filter((segment) => segment.length > 0);

const isPathParameterSegment = (segment: string) => /^\{[^}]+}$/.test(segment);

const routeOperationMappings: RouteOperationMapping[] = Object.entries(
  buildDataTyped.routeOperationIds ?? {},
)
  .map(([routeKey, operationId]) => {
    const separatorIndex = routeKey.indexOf(":");
    if (separatorIndex === -1) {
      return null;
    }

    const method = routeKey.slice(0, separatorIndex);
    const routePath = routeKey.slice(separatorIndex + 1);
    if (!method || !routePath) {
      return null;
    }

    const pathSegments = getPathSegments(routePath);
    const specificity = pathSegments.filter(
      (segment) => !isPathParameterSegment(segment),
    ).length;

    return {
      method,
      pathSegments,
      operationId,
      specificity,
    };
  })
  .filter((mapping): mapping is RouteOperationMapping => mapping !== null)
  .sort((a, b) => {
    if (b.specificity !== a.specificity) {
      return b.specificity - a.specificity;
    }

    return b.pathSegments.length - a.pathSegments.length;
  });

const routeGroupMappings: RouteGroupMapping[] = Object.entries(
  buildDataTyped.routeRateLimitGroups ?? {},
)
  .map(([routeKey, group]) => {
    const separatorIndex = routeKey.indexOf(":");
    if (separatorIndex === -1) {
      return null;
    }

    const method = routeKey.slice(0, separatorIndex).toLowerCase();
    const routePattern = routeKey.slice(separatorIndex + 1);
    if (!method || !routePattern) {
      return null;
    }

    const normalizedRoutePattern = routePattern.startsWith("^")
      ? routePattern
      : `^${routePattern}`;

    try {
      return {
        method,
        routeRegex: new RegExp(normalizedRoutePattern),
        group,
      };
    } catch {
      return null;
    }
  })
  .filter((mapping): mapping is RouteGroupMapping => mapping !== null);

const getRequestEndpoint = (url: string): string => {
  let path = url.split("?")[0] || "";
  if (path.startsWith("https://esi.evetech.net")) {
    path = path.replace("https://esi.evetech.net", "");
  }

  return normalizeRoutePath(path || "/");
};

const getRouteOperationId = (
  method: string,
  url: string,
): string | undefined => {
  const methodLower = method.toLowerCase();
  const pathSegments = getPathSegments(getRequestEndpoint(url));

  for (const mapping of routeOperationMappings) {
    if (mapping.method !== methodLower) {
      continue;
    }

    if (mapping.pathSegments.length !== pathSegments.length) {
      continue;
    }

    const isMatch = mapping.pathSegments.every((segment, index) => {
      if (isPathParameterSegment(segment)) {
        return true;
      }

      return segment === pathSegments[index];
    });

    if (isMatch) {
      return mapping.operationId;
    }
  }

  return undefined;
};

const getRouteGroup = (
  method: string,
  url: string,
  explicitOperationId?: string,
): string | undefined => {
  const operationId = explicitOperationId ?? getRouteOperationId(method, url);
  if (operationId) {
    const operationGroup =
      buildDataTyped.operationRateLimitGroups?.[operationId];
    if (operationGroup) {
      return operationGroup;
    }
  }

  const methodLower = method.toLowerCase();
  const endpoint = getRequestEndpoint(url);
  for (const mapping of routeGroupMappings) {
    if (mapping.method !== methodLower) {
      continue;
    }

    if (mapping.routeRegex.test(endpoint)) {
      return mapping.group;
    }
  }

  return undefined;
};

const getHeaderValue = (
  headers: AxiosRequestConfig["headers"] | undefined,
  key: string,
): string | undefined => {
  if (!headers) {
    return undefined;
  }

  const toStringValue = (value: unknown): string | undefined => {
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number") {
      return value.toString();
    }

    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === "string" || typeof first === "number") {
        return first.toString();
      }
    }

    return undefined;
  };

  const headersWithGet = headers as {
    get?: (headerName: string) => unknown;
  };
  if (typeof headersWithGet.get === "function") {
    const headerValue = toStringValue(headersWithGet.get(key));
    if (headerValue) {
      return headerValue;
    }
  }

  const normalizedKey = key.toLowerCase();
  for (const [headerName, value] of Object.entries(
    headers as Record<string, unknown>,
  )) {
    if (headerName.toLowerCase() === normalizedKey) {
      return toStringValue(value);
    }
  }

  return undefined;
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const tokenPayload = token.split(".")[1];
  if (!tokenPayload) {
    return null;
  }

  const normalizedPayload = tokenPayload
    .replaceAll("-", "+")
    .replaceAll("_", "/");
  const paddedPayload = normalizedPayload.padEnd(
    Math.ceil(normalizedPayload.length / 4) * 4,
    "=",
  );

  if (typeof atob !== "function") {
    return null;
  }

  try {
    return JSON.parse(atob(paddedPayload)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const extractCharacterIdFromSubject = (subject: unknown): string | null => {
  if (typeof subject !== "string") {
    return null;
  }

  const subjectSegments = subject.split(":");
  const possibleCharacterId = subjectSegments.at(-1);
  if (!possibleCharacterId || !/^\d+$/.test(possibleCharacterId)) {
    return null;
  }

  return possibleCharacterId;
};

const resolveRateLimitUserId = (
  requestConfig: RequestConfig,
  globalConfig: Partial<RequestConfig>,
): string => {
  if (
    typeof requestConfig.rateLimitUserId === "string" &&
    requestConfig.rateLimitUserId.trim() !== ""
  ) {
    return requestConfig.rateLimitUserId;
  }

  const authorizationHeader =
    getHeaderValue(requestConfig.headers, "authorization") ??
    getHeaderValue(globalConfig.headers, "authorization");

  if (!authorizationHeader) {
    return "anonymous";
  }

  const accessToken = authorizationHeader.replace(/^bearer\s+/i, "").trim();
  if (!accessToken) {
    return "anonymous";
  }

  const payload = decodeJwtPayload(accessToken);
  if (!payload) {
    return "anonymous";
  }

  const applicationId =
    typeof payload.azp === "string" && payload.azp.length > 0
      ? payload.azp
      : null;
  const characterId = extractCharacterIdFromSubject(payload.sub);

  if (applicationId && characterId) {
    return `${applicationId}:${characterId}`;
  }

  if (applicationId) {
    return `anonymous:${applicationId}`;
  }

  return "anonymous";
};

const getTokenCost = (status: number): number => {
  if (status >= 200 && status < 300) return 2;
  if (status >= 300 && status < 400) return 1;
  if (status === 429) return 0;
  if (status >= 400 && status < 500) return 5;
  if (status >= 500) return 0;
  return 0;
};

const getRatelimitUsedFromHeaders = (
  headers: AxiosResponse["headers"] | undefined,
): number | null => {
  const usedHeader = getHeaderValue(
    headers as AxiosRequestConfig["headers"],
    "x-ratelimit-used",
  );

  if (!usedHeader) {
    return null;
  }

  const used = Number.parseInt(usedHeader, 10);
  if (!Number.isFinite(used) || used < 0) {
    return null;
  }

  return used;
};

const getRetryAfterSecondsFromHeaders = (
  headers: AxiosResponse["headers"] | undefined,
): number | null => {
  if (!headers) {
    return null;
  }

  const headersRecord = headers as Record<string, unknown>;
  const directHeaderValue =
    headersRecord["retry-after"] ?? headersRecord["Retry-After"];

  const retryAfterHeader =
    (typeof directHeaderValue === "string" ||
    typeof directHeaderValue === "number"
      ? directHeaderValue.toString()
      : undefined) ??
    getHeaderValue(headers as AxiosRequestConfig["headers"], "retry-after");

  if (!retryAfterHeader) {
    return null;
  }

  const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
  if (!Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0) {
    return null;
  }

  return retryAfterSeconds;
};

const MAX_IN_FLIGHT_TOKEN_COST = 5;
const DEFAULT_USER_AGENT =
  "jitaspace-esi-client/1.0.0 (joao@jita.space) (eve:Joao Neto)";

const resolveCompatibilityDate = (
  requestConfig: RequestConfig,
  globalConfig: Partial<RequestConfig>,
) => {
  const requestCompatibilityDate = getHeaderValue(
    requestConfig.headers,
    "x-compatibility-date",
  );
  if (requestCompatibilityDate && requestCompatibilityDate.trim() !== "") {
    return requestCompatibilityDate;
  }

  const globalCompatibilityDate = getHeaderValue(
    globalConfig.headers,
    "x-compatibility-date",
  );
  if (globalCompatibilityDate && globalCompatibilityDate.trim() !== "") {
    return globalCompatibilityDate;
  }

  return buildData.buildDate;
};

const resolveUserAgent = (
  requestConfig: RequestConfig,
  globalConfig: Partial<RequestConfig>,
) => {
  if (
    typeof requestConfig.userAgent === "string" &&
    requestConfig.userAgent.trim() !== ""
  ) {
    return requestConfig.userAgent;
  }

  if (
    typeof globalConfig.userAgent === "string" &&
    globalConfig.userAgent.trim() !== ""
  ) {
    return globalConfig.userAgent;
  }

  const requestUserAgent =
    getHeaderValue(requestConfig.headers, "x-user-agent") ??
    getHeaderValue(requestConfig.headers, "user-agent");
  if (requestUserAgent && requestUserAgent.trim() !== "") {
    return requestUserAgent;
  }

  const globalUserAgent =
    getHeaderValue(globalConfig.headers, "x-user-agent") ??
    getHeaderValue(globalConfig.headers, "user-agent");
  if (globalUserAgent && globalUserAgent.trim() !== "") {
    return globalUserAgent;
  }

  return DEFAULT_USER_AGENT;
};

const resolveAcceptLanguage = (
  requestConfig: RequestConfig,
  globalConfig: Partial<RequestConfig>,
) => {
  if (
    typeof requestConfig.acceptLanguage === "string" &&
    requestConfig.acceptLanguage.trim() !== ""
  ) {
    return requestConfig.acceptLanguage;
  }

  if (
    typeof globalConfig.acceptLanguage === "string" &&
    globalConfig.acceptLanguage.trim() !== ""
  ) {
    return globalConfig.acceptLanguage;
  }

  const requestAcceptLanguage = getHeaderValue(
    requestConfig.headers,
    "accept-language",
  );
  if (requestAcceptLanguage && requestAcceptLanguage.trim() !== "") {
    return requestAcceptLanguage;
  }

  const globalAcceptLanguage = getHeaderValue(
    globalConfig.headers,
    "accept-language",
  );
  if (globalAcceptLanguage && globalAcceptLanguage.trim() !== "") {
    return globalAcceptLanguage;
  }

  return undefined;
};

export const client = async <TData, TError = unknown, TVariables = unknown>(
  config: RequestConfig<TVariables>,
): Promise<ResponseConfig<TData>> => {
  const globalConfig = getConfig();
  const method = config.method || "GET";
  const url = config.url || "";
  const endpoint = getRequestEndpoint(url);
  const userId = resolveRateLimitUserId(config, globalConfig);
  const operationId = config.operationId ?? globalConfig.operationId;
  const group = getRouteGroup(method, url, operationId);

  if (group) {
    const waitTime = getWaitTime(group, MAX_IN_FLIGHT_TOKEN_COST, userId);
    if (waitTime > 0) {
      await sleep(waitTime);
    }

    consumeTokens(group, MAX_IN_FLIGHT_TOKEN_COST, userId);
  }

  try {
    const compatibilityDate = resolveCompatibilityDate(config, globalConfig);
    const userAgent = resolveUserAgent(config, globalConfig);
    const acceptLanguage = resolveAcceptLanguage(config, globalConfig);

    const response = await axiosInstance.request<TData, ResponseConfig<TData>>({
      ...globalConfig,
      ...config,
      headers: {
        ...globalConfig.headers,
        ...config.headers,
        "X-Compatibility-Date": compatibilityDate,
        "X-User-Agent": userAgent,
        ...(acceptLanguage ? { "Accept-Language": acceptLanguage } : {}),
      },
    });

    if (group) {
      const ratelimitUsed = getRatelimitUsedFromHeaders(response.headers);
      const consumedTokens = ratelimitUsed ?? getTokenCost(response.status);
      const didSyncFromHeaders = updateRateLimitState(
        group,
        response.headers as Record<string, string>,
        userId,
      );

      if (!didSyncFromHeaders) {
        consumeTokens(group, consumedTokens - MAX_IN_FLIGHT_TOKEN_COST, userId);
      }

      recordRateLimitRequest(
        group,
        {
          endpoint,
          params: config.params,
          statusCode: response.status,
          tokenCost: consumedTokens,
        },
        userId,
      );
    }

    return response;
  } catch (e) {
    const axiosError = e as AxiosError<TError>;
    if (group && axiosError.response) {
      const ratelimitUsed = getRatelimitUsedFromHeaders(
        axiosError.response.headers,
      );
      const consumedTokens =
        ratelimitUsed ?? getTokenCost(axiosError.response.status);
      const retryAfterSeconds = getRetryAfterSecondsFromHeaders(
        axiosError.response.headers,
      );
      const didSyncFromHeaders = updateRateLimitState(
        group,
        axiosError.response.headers as Record<string, string>,
        userId,
      );

      if (!didSyncFromHeaders) {
        consumeTokens(group, consumedTokens - MAX_IN_FLIGHT_TOKEN_COST, userId);
      }

      recordRateLimitRequest(
        group,
        {
          endpoint,
          params: config.params,
          statusCode: axiosError.response.status,
          tokenCost: consumedTokens,
        },
        userId,
      );

      if (axiosError.response.status === 429 && retryAfterSeconds !== null) {
        updateRetryAfter(group, retryAfterSeconds, userId);
      }
    }
    throw e;
  }
};

client.getConfig = getConfig;
client.setConfig = setConfig;

export default client;
