"use client";

import { useMemo } from "react";

import type { ResponseConfig } from "@jitaspace/esi-client";

import type { EsiSubject } from "../auth";
import type {
  EsiQuerySource,
  MultiEsiQueryConfig,
  MultiEsiQueryEnvelope,
  SubjectQueryOptions,
} from "./useEsiSubjectQueries";
import { useEsiSubjectQueries } from "./useEsiSubjectQueries";

/** One subject's response, paired with the subject it describes. */
export interface EsiSubjectValue<TValue> {
  /** `character_id`, `corporation_id` or `alliance_id`, per the query's kind. */
  subjectId: number;
  data: TValue;
}

export interface MultiEsiValueQueryResult<
  TValue,
> extends MultiEsiQueryEnvelope {
  /**
   * One entry per subject that resolved, in subject order.
   *
   * Subjects that are still loading or failed are absent, so the array can be
   * shorter than `subjectIds`; pair them by `subjectId` rather than by index.
   */
  data: EsiSubjectValue<TValue>[];
}

/**
 * Build a hook that runs the same ESI query across every subject the logged-in
 * characters can reach, and returns one entry per subject.
 *
 * The counterpart to {@link defineMultiEsiQuery}, for the ~24 subject-scoped
 * ESI routes that answer with a single object or scalar rather than a list —
 * a character's location, wallet balance, or attributes. There is nothing to
 * flatten and nothing to tag per item, so each subject contributes one
 * `{ subjectId, data }` entry instead.
 *
 * Everything else matches the list primitive: the generated `*QueryOptions`
 * are reused verbatim so the cache entry is shared with the single-subject
 * hook, errors are attributed per subject, and `isPending` covers rehydration.
 *
 * ```ts
 * export const useMultipleCharacterLocation = defineMultiEsiValueQuery({
 *   kind: "character",
 *   scopes: ["esi-location.read_location.v1"],
 *   query: (id, headers) =>
 *     getCharactersCharacterIdLocationQueryOptions(id, headers),
 * });
 * ```
 */
export function defineMultiEsiValueQuery<TValue>(
  config: MultiEsiQueryConfig & {
    query: (
      subjectId: number,
      authHeaders: Record<string, string>,
    ) => EsiQuerySource<TValue>;
  },
) {
  const { kind, scopes, roles, query } = config;
  const subjectConfig: MultiEsiQueryConfig = { kind, scopes, roles };

  // Built once when the hook is defined, so its identity is stable across
  // renders and React Query's select memoisation actually hits.
  const buildQuery = (subject: EsiSubject) =>
    ({
      ...query(subject.id, subject.authHeaders),
      // Pair here rather than in `combine`: this closure belongs to the same
      // query as the subject it names, so the pairing cannot drift.
      select: (response: ResponseConfig<TValue>) => ({
        subjectId: subject.id,
        data: response.data,
      }),
    }) as unknown as SubjectQueryOptions<EsiSubjectValue<TValue>>;

  return function useMultiEsiValueQuery(): MultiEsiValueQueryResult<TValue> {
    const { selected, ...envelope } = useEsiSubjectQueries(
      subjectConfig,
      buildQuery,
    );

    const data = useMemo(
      () => selected.flatMap((value) => value ?? []),
      [selected],
    );

    return { ...envelope, data };
  };
}
