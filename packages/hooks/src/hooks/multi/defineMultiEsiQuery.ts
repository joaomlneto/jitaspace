"use client";

import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import type {
  CharactersCharacterIdRolesGetRolesEnum,
  ResponseConfig,
  ResponseErrorConfig,
} from "@jitaspace/esi-client";
import type { ESIScope } from "@jitaspace/esi-metadata";

import type { EsiSubject, EsiSubjectKind } from "../auth";
import { useAuthStoreHasHydrated, useEsiSubjects } from "../auth";

/** An item tagged with the subject whose response it came from. */
export type EsiSubjectItem<TItem> = TItem & {
  /** `character_id`, `corporation_id` or `alliance_id`, per the query's kind. */
  subjectId: number;
};

/** A failure, attributed to the subject whose query produced it. */
export interface EsiSubjectError {
  subjectId: number;
  error: ResponseErrorConfig<Error>;
}

export interface MultiEsiQueryResult<TItem> {
  data: EsiSubjectItem<TItem>[];
  /** True while any subject is still loading. */
  isLoading: boolean;
  /**
   * True until the result is settled — including before the persisted auth
   * store has rehydrated, when no subject is known yet.
   *
   * `isLoading` is false with an empty `data` on that first render, so a
   * consumer keying an empty state off `!isLoading && !data.length` would flash
   * it on every page load. Key off this instead.
   */
  isPending: boolean;
  /** True if any subject failed; the others still contribute their data. */
  isError: boolean;
  /** Failures paired with the subject that produced them. */
  errors: EsiSubjectError[];
  /** The subject ids that were queried, in result order. */
  subjectIds: number[];
  /** Refetch every subject's query. */
  refetch: () => void;
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
) {
  return {
    data: results.flatMap((result) => result.data ?? []),
    isLoading: results.some((result) => result.isLoading),
    isSettling: results.some((result) => result.isPending),
    isError: results.some((result) => result.isError),
    // Index-aligned with the queries, and so with the subjects that built them.
    // Attribution happens in the hook, where the subjects are in scope, rather
    // than in a closure here that could drift from the results it describes.
    errorByIndex: results.map((result) => result.error ?? null),
    refetch: () => results.forEach((result) => void result.refetch()),
  };
}

/** Attach the subject a response came from to each of its items. */
function tagWithSubject<TItem>(
  response: ResponseConfig<TItem[]>,
  subjectId: number,
): EsiSubjectItem<TItem>[] {
  return response.data.map((item) => ({ ...item, subjectId }));
}

/**
 * Build one subject's query options.
 *
 * Module-level rather than inline in the hook: the tagging closure would
 * otherwise sit six callbacks deep, and this keeps `select` readable.
 */
function buildSubjectQuery<TItem>(
  subject: EsiSubject,
  query: (
    subjectId: number,
    authHeaders: Record<string, string>,
  ) => EsiQuerySource<TItem>,
): TaggedQueryOptions<TItem> {
  return {
    ...query(subject.id, subject.authHeaders),
    // Tag here rather than in `combine`: this closure belongs to the same query
    // as the subject it names, so the tag cannot drift from the data.
    select: (response: ResponseConfig<TItem[]>) =>
      tagWithSubject(response, subject.id),
  } as unknown as TaggedQueryOptions<TItem>;
}

/**
 * Build a hook that runs the same ESI query across every subject the logged-in
 * characters can reach, and returns one flat list tagged by subject.
 *
 * The `query` callback receives a subject id and the auth headers to use, and
 * returns the generated `*QueryOptions(...)` for that endpoint — so the query
 * key matches the equivalent single-subject hook exactly and both share one
 * cache entry.
 *
 * Paginated endpoints return `esiPagedQueryOptions(...)` instead. Those do
 * *not* share a cache entry with the single-subject hook: "every page" and
 * "page 1" are different resources that happen to have the same response
 * shape, so the key is deliberately distinguished.
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
    const hasHydrated = useAuthStoreHasHydrated();

    // Memoised so `select` keeps its identity between renders: React Query
    // memoises the transform on `options.select === previousSelect`, so a fresh
    // closure each render re-runs the map and a deep `replaceEqualDeep` pass
    // over every item, for every subject, on every render.
    const queries = useMemo(
      () => subjects.map((subject) => buildSubjectQuery(subject, query)),
      [subjects],
    );

    const { errorByIndex, isSettling, ...combined } = useQueries({
      queries,
      combine: combineSubjectResults<TItem>,
    });

    const subjectIds = useMemo(
      () => subjects.map((subject) => subject.id),
      [subjects],
    );

    // Walk the subjects rather than the errors: the two are index-aligned
    // (the queries were built from the subjects, in order), and this way the
    // subject id comes from the subject itself instead of a parallel lookup.
    const errors = useMemo(
      () =>
        subjects.flatMap((subject, index) => {
          const error = errorByIndex[index];
          return error ? [{ subjectId: subject.id, error }] : [];
        }),
      [subjects, errorByIndex],
    );

    return {
      ...combined,
      errors,
      subjectIds,
      // Before rehydration there are no subjects yet, so every query reports
      // settled-and-empty. Treat that as pending so consumers do not flash an
      // empty state on first paint.
      isPending: !hasHydrated || isSettling,
    };
  };
}
