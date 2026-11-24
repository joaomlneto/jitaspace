"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { queryOptions, useQueries, useQuery } from "@tanstack/react-query";

import type { Localized } from "./localize";
import type { SdeRecords, SdeTableName } from "./types";
import { useEsiAcceptLanguage } from "../hooks/useEsiAcceptLanguage";
import { REFERENCE_DATA_STALE_TIME_MS } from "../hooks/utils/useEsiQueriesById";
import { fetchSdeRecord, fetchSdeTable } from "./client";
import { localizeRecord, sdeLanguage } from "./localize";

/**
 * Tables whose key 0 is a real record: group 0 is "#System", and the site
 * links to it. Every other table starts at 1, so 0 there is a placeholder for
 * an id that is not known yet, and is not fetched.
 */
const TABLES_WITH_KEY_ZERO = new Set<SdeTableName>(["groups", "categories"]);

const isFetchableKey = (table: SdeTableName, key: number | undefined) =>
  key !== undefined &&
  Number.isSafeInteger(key) &&
  key >= (TABLES_WITH_KEY_ZERO.has(table) ? 0 : 1);

/** The cache entry for one SDE record, shared by every hook that reads it. */
export const sdeRecordQueryOptions = <T extends SdeTableName>(
  table: T,
  key: number,
) =>
  queryOptions({
    queryKey: ["sde", table, key] as const,
    queryFn: ({ signal }) => fetchSdeRecord(table, key, signal),
    staleTime: REFERENCE_DATA_STALE_TIME_MS,
  });

/** The cache entry for a whole SDE table. */
export const sdeTableQueryOptions = <T extends SdeTableName>(table: T) =>
  queryOptions({
    queryKey: ["sde", table] as const,
    queryFn: ({ signal }) => fetchSdeTable(table, signal),
    staleTime: REFERENCE_DATA_STALE_TIME_MS,
  });

export interface SdeHookOptions {
  /** Set false to hold the request back; an unknown key is never fetched. */
  enabled?: boolean;
}

/** The reader's ESI language, as the SDE spells it. */
export const useSdeLanguage = () => sdeLanguage(useEsiAcceptLanguage());

/**
 * One SDE record, with its localized fields in the reader's language.
 *
 * Pass `undefined` while the key is still unknown.
 */
export function useSdeRecord<T extends SdeTableName>(
  table: T,
  key: number | undefined,
  { enabled = true }: SdeHookOptions = {},
): UseQueryResult<Localized<SdeRecords[T]>> {
  const language = useSdeLanguage();
  const select = useCallback(
    (record: SdeRecords[T]) => localizeRecord(record, language),
    [language],
  );
  return useQuery({
    ...sdeRecordQueryOptions(table, key ?? -1),
    enabled: enabled && isFetchableKey(table, key),
    select,
  });
}

export interface SdeRecordsByKey<T> {
  /** Every record that has resolved, keyed by the key it was requested by. */
  data: Record<number, T>;
  /** True while any key is still on its first load. */
  isLoading: boolean;
  /**
   * The keys that have failed and have nothing to show. Holds through a
   * refetch of the failed key and is unaffected by other keys loading.
   */
  failedIds: number[];
}

/**
 * Several records of one SDE table at once, keyed by key. Each is its own
 * query, sharing its cache entry with `useSdeRecord`, so one failing key does
 * not take the others with it.
 */
export function useSdeRecords<T extends SdeTableName>(
  table: T,
  keys: readonly number[],
): SdeRecordsByKey<Localized<SdeRecords[T]>> {
  const language = useSdeLanguage();
  // Keyed by content, so a caller passing a fresh array each render keeps one
  // combine, and so one stable result for its memos.
  const keysKey = keys.filter((key) => isFetchableKey(table, key)).join(",");
  const stableKeys = useMemo(
    () => (keysKey === "" ? [] : keysKey.split(",").map(Number)),
    [keysKey],
  );
  const combine = useCallback(
    (
      results: UseQueryResult<SdeRecords[T]>[],
    ): SdeRecordsByKey<Localized<SdeRecords[T]>> => {
      const data: Record<number, Localized<SdeRecords[T]>> = {};
      const failedIds: number[] = [];
      for (const [index, result] of results.entries()) {
        const key = stableKeys[index];
        if (key === undefined) continue;
        if (result.data) data[key] = localizeRecord(result.data, language);
        // A refetch clears `error` while it runs; the count survives it.
        if (!result.data && result.errorUpdateCount > 0) failedIds.push(key);
      }
      return {
        data,
        isLoading: results.some((result) => result.isLoading),
        failedIds,
      };
    },
    [stableKeys, language],
  );
  return useQueries({
    queries: stableKeys.map((key) => sdeRecordQueryOptions(table, key)),
    combine,
  });
}

/**
 * A whole SDE table, through `select`. For small tables only: the file holds
 * every record in every language.
 */
export function useSdeTable<T extends SdeTableName, TSelected>(
  table: T,
  select: (records: SdeRecords[T][]) => TSelected,
  { enabled = true }: SdeHookOptions = {},
): UseQueryResult<TSelected> {
  return useQuery({ ...sdeTableQueryOptions(table), enabled, select });
}
