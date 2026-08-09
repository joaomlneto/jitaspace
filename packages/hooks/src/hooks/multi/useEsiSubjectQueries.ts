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

/** A failure, attributed to the subject whose query produced it. */
export interface EsiSubjectError {
  subjectId: number;
  error: ResponseErrorConfig<Error>;
}

/**
 * Everything a multi-subject hook reports apart from its data.
 *
 * Both primitives return this envelope, so "one flat list" and "one value per
 * subject" differ only in the shape of `data`.
 */
export interface MultiEsiQueryEnvelope {
  /** True while any subject is still loading. */
  isLoading: boolean;
  /**
   * True until the result is settled — including before the persisted auth
   * store has rehydrated, when no subject is known yet.
   *
   * `isLoading` is false with empty data on that first render, so a consumer
   * keying an empty state off it would flash on every page load.
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
 * the multi-subject wrappers need.
 *
 * Deliberately structural rather than React Query's `UseQueryOptions`: those
 * are contravariant in the query key, so the generated tuple keys (for example
 * `readonly [{ url: "/characters/:character_id/fittings", ... }]`) will not
 * assign to any shared alias that widens the key to `readonly unknown[]`.
 */
export interface EsiQuerySource<TResponse> {
  queryKey: readonly unknown[];
  /**
   * Optional, and sync-or-async, to match how React Query types `queryFn` in
   * the generated options.
   */
  queryFn?: (
    ...args: never[]
  ) => ResponseConfig<TResponse> | Promise<ResponseConfig<TResponse>>;
  enabled?: unknown;
}

/** The options one subject's query runs with, after `select` is attached. */
export type SubjectQueryOptions<TSelected> = UseQueryOptions<
  unknown,
  ResponseErrorConfig<Error>,
  TSelected
>;

/**
 * Module-level so its identity is stable across renders — React Query only
 * re-runs `combine` when the results or the function itself change. It closes
 * over nothing, so it cannot go stale; each subject's data is already tagged
 * by that query's own `select`.
 */
function combineSubjectResults<TSelected>(
  results: UseQueryResult<TSelected, ResponseErrorConfig<Error>>[],
) {
  return {
    selected: results.map((result) => result.data),
    isLoading: results.some((result) => result.isLoading),
    isSettling: results.some((result) => result.isPending),
    isError: results.some((result) => result.isError),
    // Index-aligned with the queries, and so with the subjects that built them.
    // Attribution happens below, where the subjects are in scope, rather than
    // in a closure here that could drift from the results it describes.
    errorByIndex: results.map((result) => result.error ?? null),
    refetch: () => results.forEach((result) => void result.refetch()),
  };
}

export interface MultiEsiQueryConfig {
  kind: EsiSubjectKind;
  scopes?: ESIScope[];
  roles?: CharactersCharacterIdRolesGetRolesEnum[];
}

/**
 * Run one query per reachable subject and assemble the shared envelope.
 *
 * `buildQuery` owns the per-subject `select`, which is where each subject tags
 * its own data — that closure belongs to the same query as the subject it
 * names, so the tag cannot drift from the data it describes.
 */
export function useEsiSubjectQueries<TSelected>(
  config: MultiEsiQueryConfig,
  buildQuery: (subject: EsiSubject) => SubjectQueryOptions<TSelected>,
): MultiEsiQueryEnvelope & { selected: (TSelected | undefined)[] } {
  const subjects = useEsiSubjects(config);
  const hasHydrated = useAuthStoreHasHydrated();

  // Memoised so each `select` keeps its identity between renders: React Query
  // memoises the transform on `options.select === previousSelect`, so a fresh
  // closure each render re-runs it and deep-compares the result, per subject,
  // on every render.
  const queries = useMemo(
    () => subjects.map((subject) => buildQuery(subject)),
    [subjects, buildQuery],
  );

  // React Query types `combine`'s parameter as a conditional
  // (`unknown extends TSelected ? unknown : TSelected`) which cannot resolve
  // against a generic that is still open here, so the result is re-asserted.
  const { errorByIndex, isSettling, selected, ...combined } = useQueries({
    queries,
    combine: combineSubjectResults,
  }) as ReturnType<typeof combineSubjectResults<TSelected>>;

  const subjectIds = useMemo(
    () => subjects.map((subject) => subject.id),
    [subjects],
  );

  // Walk the subjects rather than the errors: the two are index-aligned (the
  // queries were built from the subjects, in order), and this way the subject
  // id comes from the subject itself instead of a parallel lookup.
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
    selected,
    errors,
    subjectIds,
    // Before rehydration there are no subjects yet, so every query reports
    // settled-and-empty. Treat that as pending so consumers do not flash an
    // empty state on first paint.
    isPending: !hasHydrated || isSettling,
  };
}
