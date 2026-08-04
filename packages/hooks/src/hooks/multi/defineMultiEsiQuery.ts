"use client";

import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useQueries } from "@tanstack/react-query";

import type {
  CharactersCharacterIdRolesGetRolesEnum,
  ResponseConfig,
  ResponseErrorConfig,
} from "@jitaspace/esi-client";
import type { ESIScope } from "@jitaspace/esi-metadata";

import type { EsiSubjectKind } from "../auth";
import { useEsiSubjects } from "../auth";

/** An item tagged with the subject whose response it came from. */
export type EsiSubjectItem<TItem> = TItem & {
  /** `character_id`, `corporation_id` or `alliance_id`, per the query's kind. */
  subjectId: number;
};

export interface MultiEsiQueryResult<TItem> {
  data: EsiSubjectItem<TItem>[];
  /** True while any subject is still loading. */
  isLoading: boolean;
  /** True if any subject failed; the others still contribute their data. */
  isError: boolean;
  errors: ResponseErrorConfig<Error>[];
  /** The subject ids that were queried, in result order. */
  subjectIds: number[];
}

/**
 * What a generated `*QueryOptions(...)` result must provide, reduced to what
 * the multi-subject wrapper needs.
 *
 * Deliberately structural rather than React Query's `UseQueryOptions`: those
 * are contravariant in the query key, so the generated tuple keys (for example
 * `readonly [{ url: "/characters/:character_id/fittings", ... }]`) will not
 * assign to any shared alias that widens the key to `readonly unknown[]`.
 */
export interface EsiQuerySource<TItem> {
  queryKey: readonly unknown[];
  /**
   * Optional, and sync-or-async, to match how React Query types `queryFn` in
   * the generated options.
   */
  queryFn?: (
    ...args: never[]
  ) => ResponseConfig<TItem[]> | Promise<ResponseConfig<TItem[]>>;
  enabled?: unknown;
}

type TaggedQueryOptions<TItem> = UseQueryOptions<
  ResponseConfig<TItem[]>,
  ResponseErrorConfig<Error>,
  EsiSubjectItem<TItem>[]
>;

/**
 * Module-level so its identity is stable across renders — React Query only
 * re-runs `combine` when the results or the function itself change. It closes
 * over nothing, so it cannot go stale; each item is already tagged with its
 * subject by that query's own `select`.
 */
function combineSubjectResults<TItem>(
  results: UseQueryResult<
    EsiSubjectItem<TItem>[],
    ResponseErrorConfig<Error>
  >[],
): Omit<MultiEsiQueryResult<TItem>, "subjectIds"> {
  return {
    data: results.flatMap((result) => result.data ?? []),
    isLoading: results.some((result) => result.isLoading),
    isError: results.some((result) => result.isError),
    errors: results
      .map((result) => result.error)
      .filter((error): error is ResponseErrorConfig<Error> => error != null),
  };
}

/**
 * Build a hook that runs the same ESI query across every subject the logged-in
 * characters can reach, and returns one flat list tagged by subject.
 *
 * The `query` callback receives a subject id and the auth headers to use, and
 * returns the generated `*QueryOptions(...)` for that endpoint — so the query
 * key matches the equivalent single-subject hook exactly and both share one
 * cache entry. For paginated endpoints, return `esiPagedQueryOptions(...)`
 * instead of the generated options.
 *
 * ```ts
 * export const useMultipleCharacterFittings = defineMultiEsiQuery({
 *   kind: "character",
 *   scopes: ["esi-fittings.read_fittings.v1"],
 *   query: (id, headers) =>
 *     getCharactersCharacterIdFittingsQueryOptions(id, headers),
 * });
 * ```
 */
export function defineMultiEsiQuery<TItem>(config: {
  kind: EsiSubjectKind;
  scopes?: ESIScope[];
  roles?: CharactersCharacterIdRolesGetRolesEnum[];
  query: (
    subjectId: number,
    authHeaders: Record<string, string>,
  ) => EsiQuerySource<TItem>;
}) {
  const { kind, scopes, roles, query } = config;

  return function useMultiEsiQuery(): MultiEsiQueryResult<TItem> {
    const subjects = useEsiSubjects({ kind, scopes, roles });

    const combined = useQueries({
      queries: subjects.map((subject) => ({
        ...query(subject.id, subject.authHeaders),
        // Tag here rather than in `combine`: this closure belongs to the same
        // query as the subject it names, so the tag cannot drift from the data.
        select: (response: ResponseConfig<TItem[]>) =>
          response.data.map((item) => ({ ...item, subjectId: subject.id })),
      })) as unknown as TaggedQueryOptions<TItem>[],
      combine: combineSubjectResults<TItem>,
    });

    return { ...combined, subjectIds: subjects.map((subject) => subject.id) };
  };
}
