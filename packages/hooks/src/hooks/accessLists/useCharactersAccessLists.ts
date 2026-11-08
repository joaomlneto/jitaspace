"use client";

import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";

import type {
  GetCharactersAccessListsDetailQueryResponse,
  GetCharactersAccessListsListingQueryResponse,
  ResponseConfig,
  ResponseErrorConfig,
} from "@jitaspace/esi-client";
import {
  getCharactersAccessListsDetailQueryOptions,
  getCharactersAccessListsListingQueryOptions,
} from "@jitaspace/esi-client";

import type { EsiSubject } from "../auth";
import type { AccessListDetail } from "./useCharacterAccessList";
import { useAuthStoreHasHydrated, useEsiSubjects } from "../auth";
import { ACCESS_LISTS_SCOPE } from "./useCharacterAccessLists";

/** One access list, and which of the requested characters ESI lists it for. */
export interface AccessListGrant {
  accessListId: number;
  /**
   * The requested characters that manage this list (as a Manager or Admin),
   * in request order. Never empty.
   */
  characterIds: number[];
}

/** A character whose access lists could not be read. */
export interface CharacterAccessListsError {
  characterId: number;
  error: ResponseErrorConfig<Error>;
}

/** An access list whose details could not be read. */
export interface AccessListDetailError {
  accessListId: number;
  /** The character whose token the failed request was signed with. */
  characterId: number;
  error: ResponseErrorConfig<Error>;
}

export interface CharactersAccessListsResult {
  /** Every access list any requested character manages, each listed once. */
  data: AccessListGrant[];
  /**
   * The characters that were queried: those requested that are logged in, not
   * expired, and granted the access lists scope.
   */
  characterIds: number[];
  /** The queried characters whose listing has not settled yet. */
  pendingCharacterIds: number[];
  /** Failures, one per character; the others still contribute their lists. */
  errors: CharacterAccessListsError[];
  /** True while any character's listing is on its first load. */
  isLoading: boolean;
  /**
   * True until every listing has settled — including before the persisted
   * auth store has rehydrated, when no character is known yet, so an empty
   * state does not flash on first paint.
   */
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
}

/** An access list's details, and which requested characters manage it. */
export type AccessListWithCharacters = AccessListDetail & {
  /** As in {@link AccessListGrant.characterIds}. */
  characterIds: number[];
};

export interface CharactersAccessListDetailsResult extends Omit<
  CharactersAccessListsResult,
  "data"
> {
  /**
   * The access lists whose details have loaded, in the order of
   * `accessLists`. Lists still loading or that failed are absent.
   */
  data: AccessListWithCharacters[];
  /** Every access list the characters manage, resolved or not. */
  accessLists: AccessListGrant[];
  /** The access lists whose details have not settled yet. */
  pendingAccessListIds: number[];
  /** Failures, one per access list whose details could not be read. */
  detailErrors: AccessListDetailError[];
}

type ListingResult = UseQueryResult<
  ResponseConfig<GetCharactersAccessListsListingQueryResponse>,
  ResponseErrorConfig<Error>
>;
type DetailResult = UseQueryResult<
  ResponseConfig<GetCharactersAccessListsDetailQueryResponse>,
  ResponseErrorConfig<Error>
>;

/**
 * Module-level, so `useQueries` keeps one combine and returns the same object
 * until a query actually changes. Index-aligned with the queries, and so with
 * whatever built them; the callers attribute by index.
 */
function combineResults<TData>(
  results: UseQueryResult<ResponseConfig<TData>, ResponseErrorConfig<Error>>[],
) {
  return {
    data: results.map((result) => result.data?.data),
    errors: results.map((result) => result.error ?? null),
    pending: results.map((result) => result.isPending),
    isLoading: results.some((result) => result.isLoading),
    isPending: results.some((result) => result.isPending),
    isError: results.some((result) => result.isError),
    refetch: () => results.forEach((result) => void result.refetch()),
  };
}
const combineListings = (results: ListingResult[]) => combineResults(results);
const combineDetails = (results: DetailResult[]) => combineResults(results);

/**
 * The logged-in characters that can read access lists, narrowed to
 * `characterIds` (in that order) when given.
 */
function useAccessListSubjects(characterIds?: readonly number[]) {
  const subjects = useEsiSubjects({
    kind: "character",
    scopes: [ACCESS_LISTS_SCOPE],
  });

  // Keyed by content, so a caller passing a fresh array each render does not
  // rebuild every query's options each render.
  const idsKey = characterIds?.join(",");
  return useMemo(() => {
    if (idsKey === undefined) return subjects;
    const byId = new Map(subjects.map((subject) => [subject.id, subject]));
    const requested = idsKey === "" ? [] : idsKey.split(",").map(Number);
    return [...new Set(requested)].flatMap((id) => byId.get(id) ?? []);
  }, [subjects, idsKey]);
}

function useAccessListListings(
  subjects: EsiSubject[],
): CharactersAccessListsResult {
  const hasHydrated = useAuthStoreHasHydrated();

  const listings = useQueries({
    queries: subjects.map((subject) =>
      getCharactersAccessListsListingQueryOptions(
        subject.id,
        subject.authHeaders,
      ),
    ) as unknown as UseQueryOptions<
      ResponseConfig<GetCharactersAccessListsListingQueryResponse>,
      ResponseErrorConfig<Error>
    >[],
    combine: combineListings,
  });

  const data = useMemo(() => {
    const grants = new Map<number, AccessListGrant>();
    subjects.forEach((subject, index) => {
      for (const { id } of listings.data[index]?.access_lists ?? []) {
        let grant = grants.get(id);
        if (!grant) {
          grant = { accessListId: id, characterIds: [] };
          grants.set(id, grant);
        }
        // ESI could list the same id twice; one character manages it once.
        if (!grant.characterIds.includes(subject.id)) {
          grant.characterIds.push(subject.id);
        }
      }
    });
    return [...grants.values()];
  }, [subjects, listings.data]);

  const characterIds = useMemo(
    () => subjects.map((subject) => subject.id),
    [subjects],
  );

  const pendingCharacterIds = useMemo(
    () => characterIds.filter((_id, index) => listings.pending[index]),
    [characterIds, listings.pending],
  );

  const errors = useMemo(
    () =>
      characterIds.flatMap((characterId, index) => {
        const error = listings.errors[index];
        return error ? [{ characterId, error }] : [];
      }),
    [characterIds, listings.errors],
  );

  return {
    data,
    characterIds,
    pendingCharacterIds,
    errors,
    isLoading: listings.isLoading,
    isPending: !hasHydrated || listings.isPending,
    isError: listings.isError,
    refetch: listings.refetch,
  };
}

/**
 * The access lists that several characters manage, merged into one list.
 *
 * `characterIds` defaults to every logged-in character that granted the
 * access lists scope; requested characters that cannot be queried (not logged
 * in, expired, or without the scope) are left out — `characterIds` in the
 * result says which were. A list several of them manage appears once.
 *
 * Each listing shares its cache entry with {@link useCharacterAccessLists}.
 */
export function useCharactersAccessLists(
  characterIds?: readonly number[],
): CharactersAccessListsResult {
  return useAccessListListings(useAccessListSubjects(characterIds));
}

/**
 * {@link useCharactersAccessLists}, with each access list's details.
 *
 * A list is read once, with the token of the first character that manages it:
 * the details are the same whoever asks. Each read shares its cache entry with
 * {@link useCharacterAccessList}.
 */
export function useCharactersAccessListDetails(
  characterIds?: readonly number[],
): CharactersAccessListDetailsResult {
  const subjects = useAccessListSubjects(characterIds);
  const { data: accessLists, ...listings } = useAccessListListings(subjects);

  // Pair each list with the subject that signs for it once, so the queries
  // and the attribution below cannot disagree about who asked.
  const signed = useMemo(() => {
    const byId = new Map(subjects.map((subject) => [subject.id, subject]));
    return accessLists.flatMap((grant) => {
      const signer = byId.get(grant.characterIds[0] ?? 0);
      return signer ? [{ grant, signer }] : [];
    });
  }, [subjects, accessLists]);

  const details = useQueries({
    queries: signed.map(({ grant, signer }) =>
      getCharactersAccessListsDetailQueryOptions(
        grant.accessListId,
        signer.id,
        signer.authHeaders,
      ),
    ) as unknown as UseQueryOptions<
      ResponseConfig<GetCharactersAccessListsDetailQueryResponse>,
      ResponseErrorConfig<Error>
    >[],
    combine: combineDetails,
  });

  const data = useMemo(
    () =>
      signed.flatMap(({ grant }, index) => {
        const detail = details.data[index];
        return detail ? [{ ...detail, characterIds: grant.characterIds }] : [];
      }),
    [signed, details.data],
  );

  const pendingAccessListIds = useMemo(
    () =>
      signed
        .filter((_entry, index) => details.pending[index])
        .map(({ grant }) => grant.accessListId),
    [signed, details.pending],
  );

  const detailErrors = useMemo(
    () =>
      signed.flatMap(({ grant, signer }, index) => {
        const error = details.errors[index];
        return error
          ? [
              {
                accessListId: grant.accessListId,
                characterId: signer.id,
                error,
              },
            ]
          : [];
      }),
    [signed, details.errors],
  );

  const { refetch: refetchListings } = listings;
  const { refetch: refetchDetails } = details;

  return {
    ...listings,
    data,
    accessLists,
    pendingAccessListIds,
    detailErrors,
    isLoading: listings.isLoading || details.isLoading,
    isPending: listings.isPending || details.isPending,
    isError: listings.isError || details.isError,
    refetch: () => {
      refetchListings();
      refetchDetails();
    },
  };
}
