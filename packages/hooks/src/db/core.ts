"use client";

import type { CollectionConfig, UtilsRecord } from "@tanstack/db";
import { createCollection } from "@tanstack/db";
import { parseLoadSubsetOptions } from "@tanstack/query-db-collection";
import { QueryClient } from "@tanstack/react-query";

import type { GetCharactersCharacterIdSearchQueryParamsCategoriesEnum } from "@jitaspace/esi-client";
import { subscribeToAcceptLanguage } from "@jitaspace/esi-client";

export type ResolvableEntityCategory =
  | GetCharactersCharacterIdSearchQueryParamsCategoriesEnum
  | "stargate";

export type WithId<T, K extends string> = T & Record<K, number | string>;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 24,
    },
  },
});

// This client is owned by the package rather than the app, so it sits outside
// the provider tree the app invalidates on a language change — and with a
// 24-hour staleTime, a switch would otherwise leave collections serving the
// previous language's names for a full day. Subscribing to the ESI client's own
// config keeps the invalidation with the cache that needs it.
subscribeToAcceptLanguage(() => {
  void queryClient.invalidateQueries();
});

export function createQueryCollection<
  T extends object,
  TKey extends string | number,
  TUtils extends UtilsRecord = UtilsRecord,
>(queryOpts: CollectionConfig<T, TKey, never, TUtils> & { utils: TUtils }) {
  return createCollection(queryOpts);
}

export function extractIdFromCtx(
  ctx: { meta?: { loadSubsetOptions?: unknown } },
  fieldName: string,
): string | number | undefined {
  if (!ctx.meta?.loadSubsetOptions) return undefined;
  const params = parseLoadSubsetOptions(ctx.meta.loadSubsetOptions);
  return params.filters.find((f: { field: string | (string | number)[] }) =>
    typeof f.field === "string"
      ? f.field.includes(fieldName)
      : f.field.some((part) => part.toString().includes(fieldName)),
  )?.value as string | number | undefined;
}
