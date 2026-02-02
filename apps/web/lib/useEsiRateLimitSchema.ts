"use client";

import { useEffect, useMemo, useState } from "react";

import type { RateLimitSchemaEntry } from "@jitaspace/esi-client";
import { getRateLimitRouteKey, registerRateLimitConfig } from "@jitaspace/esi-client";

const ESI_COMPATIBILITY_DATE = "2025-12-16";
const ESI_OPENAPI_URL = `https://esi.evetech.net/meta/openapi.json?compatibility_date=${ESI_COMPATIBILITY_DATE}`;

type RateLimitRouteConfig = {
  routeKey: string;
  method: string;
  path: string;
  group: string;
  windowMs: number;
  maxTokens: number;
};

type RateLimitGroupConfig = {
  group: string;
  windowMs: number;
  maxTokens: number;
  routeCount: number;
  routes: string[];
  inconsistent: boolean;
};

type RateLimitSchemaState = {
  isLoading: boolean;
  error?: string;
  routes: RateLimitRouteConfig[];
  groups: RateLimitGroupConfig[];
  fetchedAt?: number;
  specVersion?: string;
  specTitle?: string;
  sourceUrl: string;
};

const parseWindowSize = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value * 1000;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric * 1000;
  }
  const match = trimmed.match(/^(\d+)\s*(ms|s|m|h)$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[2].toLowerCase();
  if (unit === "ms") return amount;
  if (unit === "s") return amount * 1000;
  if (unit === "m") return amount * 60 * 1000;
  if (unit === "h") return amount * 60 * 60 * 1000;
  return null;
};

const parseMaxTokens = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const useEsiRateLimitSchema = (): RateLimitSchemaState => {
  const [state, setState] = useState<RateLimitSchemaState>({
    isLoading: true,
    routes: [],
    groups: [],
    sourceUrl: ESI_OPENAPI_URL,
  });

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(ESI_OPENAPI_URL, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`OpenAPI fetch failed (${response.status})`);
        }
        const spec = (await response.json()) as Record<string, unknown>;
        const paths = spec.paths;
        if (!isObject(paths)) {
          throw new Error("OpenAPI spec missing paths");
        }

        const routes: RateLimitRouteConfig[] = [];
        const groupMap = new Map<string, Omit<RateLimitGroupConfig, "routeCount">>();
        const methods = [
          "get",
          "post",
          "put",
          "patch",
          "delete",
          "options",
          "head",
        ];

        for (const [path, pathItem] of Object.entries(paths)) {
          if (!isObject(pathItem)) continue;
          for (const method of methods) {
            const operation = pathItem[method];
            if (!isObject(operation)) continue;
            const rateLimit = operation["x-rate-limit"];
            if (!isObject(rateLimit)) continue;
            const group = rateLimit.group;
            const windowMs = parseWindowSize(rateLimit["window-size"]);
            const maxTokens = parseMaxTokens(rateLimit["max-tokens"]);
            if (typeof group !== "string" || !windowMs || !maxTokens) continue;

            const routeKey = getRateLimitRouteKey(method, path);
            routes.push({
              routeKey,
              method: method.toUpperCase(),
              path,
              group,
              windowMs,
              maxTokens,
            });

            const existing = groupMap.get(group);
            if (!existing) {
              groupMap.set(group, {
                group,
                windowMs,
                maxTokens,
                routes: [routeKey],
                inconsistent: false,
              });
            } else {
              existing.routes.push(routeKey);
              if (
                existing.windowMs !== windowMs ||
                existing.maxTokens !== maxTokens
              ) {
                existing.inconsistent = true;
              }
            }
          }
        }

        const groups = Array.from(groupMap.values()).map((group) => ({
          ...group,
          routeCount: group.routes.length,
        }));

        const metaEntries: RateLimitSchemaEntry[] = routes.map((route) => ({
          routeKey: route.routeKey,
          group: route.group,
          windowMs: route.windowMs,
          maxTokens: route.maxTokens,
        }));

        registerRateLimitConfig(metaEntries);

        setState({
          isLoading: false,
          routes,
          groups,
          fetchedAt: Date.now(),
          specVersion: isObject(spec.info) ? String(spec.info.version ?? "") : "",
          specTitle: isObject(spec.info) ? String(spec.info.title ?? "") : "",
          sourceUrl: ESI_OPENAPI_URL,
        });
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    };

    void load();
    return () => controller.abort();
  }, []);

  return useMemo(() => state, [state]);
};

