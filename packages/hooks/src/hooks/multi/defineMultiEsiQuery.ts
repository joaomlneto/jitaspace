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

/** An item tagged with the subject whose response it came from. */
export type EsiSubjectItem<TItem> = TItem & {
  /** `character_id`, `corporation_id` or `alliance_id`, per the query's kind. */
  subjectId: number;
};

export interface MultiEsiQueryResult<TItem> extends MultiEsiQueryEnvelope {
  /** Every subject's items, flattened, each tagged with where it came from. */
  data: EsiSubjectItem<TItem>[];
}

/**
 * Build a hook that runs the same ESI query across every subject the logged-in
 * characters can reach, and returns one flat list tagged by subject.
 *
 * For endpoints that return a single value rather than a list, use
 * {@link defineMultiEsiValueQuery} instead.
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
  kind: MultiEsiQueryConfig["kind"];
  scopes?: MultiEsiQueryConfig["scopes"];
  roles?: MultiEsiQueryConfig["roles"];
  query: (
    subjectId: number,
    authHeaders: Record<string, string>,
  ) => EsiQuerySource<TItem[]>;
}) {
  const { kind, scopes, roles, query } = config;
  const subjectConfig: MultiEsiQueryConfig = { kind, scopes, roles };

  // Built once when the hook is defined, so its identity is stable across
  // renders and React Query's select memoisation actually hits.
  const buildQuery = (subject: EsiSubject) =>
    ({
      ...query(subject.id, subject.authHeaders),
      // Tag here rather than in `combine`: this closure belongs to the same
      // query as the subject it names, so the tag cannot drift from the data.
      select: (response: ResponseConfig<TItem[]>) =>
        response.data.map((item) => ({ ...item, subjectId: subject.id })),
    }) as unknown as SubjectQueryOptions<EsiSubjectItem<TItem>[]>;

  return function useMultiEsiQuery(): MultiEsiQueryResult<TItem> {
    const { selected, ...envelope } = useEsiSubjectQueries(
      subjectConfig,
      buildQuery,
    );

    const data = useMemo(
      () => selected.flatMap((items) => items ?? []),
      [selected],
    );

    return { ...envelope, data };
  };
}
