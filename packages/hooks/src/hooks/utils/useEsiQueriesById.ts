"use client";

import type {
  QueryKey,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { useQueries } from "@tanstack/react-query";

import type {
  ResponseConfig,
  ResponseErrorConfig,
} from "@jitaspace/esi-client";

/**
 * What a generated `*QueryOptions(...)` result must provide, reduced to what
 * this helper needs. Structural for the same reason as EsiQuerySource: the
 * generated tuple query keys do not assign to react-query's widened alias.
 */
interface EsiQueryByIdSource<TItem> {
  queryKey: QueryKey;
  queryFn?: (
    ...args: never[]
  ) => ResponseConfig<TItem> | Promise<ResponseConfig<TItem>>;
  staleTime?: number;
}

/**
 * How long static reference data (types, dogma attributes) counts as fresh.
 *
 * The app's QueryClient uses react-query's defaults — staleTime 0 and refetch
 * on window focus — so without this every id refetched on every focus. For the
 * hand-rolled hooks this replaced that meant one request per id per alt-tab
 * (150+ on /compare) for data that only changes when CCP patches the game.
 */
export const REFERENCE_DATA_STALE_TIME_MS = 24 * 60 * 60 * 1000;

export interface EsiQueriesById<TItem> {
  /** Every resource that has resolved, keyed by its own id. */
  data: Record<number, TItem>;
  /** True while any id is still on its first load. */
  isLoading: boolean;
  /** Failures, one per id that failed; the other ids are unaffected. */
  errors: ResponseErrorConfig<Error>[];
}

/**
 * Fetch one ESI resource per id through react-query, indexed by id.
 *
 * The hand-rolled version this replaces ran `Promise.all` inside an effect:
 * one failed id discarded every other response, the rejection went unhandled,
 * nothing was cached or retried, and a slow earlier batch could overwrite a
 * newer one. Here each id is its own query — sharing its cache entry with the
 * single-id hook for the same endpoint — so failures stay per id.
 *
 * `idOf` should be a module-level function: it keys the memoised combine.
 */
export function useEsiQueriesById<TItem>(
  ids: readonly number[],
  queryOptions: (id: number) => EsiQueryByIdSource<TItem>,
  idOf: (item: TItem) => number,
): EsiQueriesById<TItem> {
  const combine = useCallback(
    (
      results: UseQueryResult<
        ResponseConfig<TItem>,
        ResponseErrorConfig<Error>
      >[],
    ): EsiQueriesById<TItem> => {
      const data: Record<number, TItem> = {};
      const errors: ResponseErrorConfig<Error>[] = [];
      for (const result of results) {
        if (result.data) data[idOf(result.data.data)] = result.data.data;
        if (result.error) errors.push(result.error);
      }
      return {
        data,
        isLoading: results.some((result) => result.isLoading),
        errors,
      };
    },
    [idOf],
  );

  return useQueries({
    queries: ids.map((id) => queryOptions(id)) as unknown as UseQueryOptions<
      ResponseConfig<TItem>,
      ResponseErrorConfig<Error>
    >[],
    combine,
  });
}
