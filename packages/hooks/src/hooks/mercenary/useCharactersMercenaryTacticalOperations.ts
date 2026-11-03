"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";

import type {
  GetCharactersMercenaryTacticalOperationsListingQueryResponse,
  ResponseConfig,
  ResponseErrorConfig,
} from "@jitaspace/esi-client";
import {
  getCharactersMercenaryTacticalOperationsDetailQueryOptions,
  getCharactersMercenaryTacticalOperationsListingQueryOptions,
} from "@jitaspace/esi-client";

import type { EsiSubject } from "../auth";
import type { MercenaryTacticalOperationDetails } from "./useCharacterMercenaryTacticalOperation";
import {
  useAuthenticatedCharacterIds,
  useAuthStoreHasHydrated,
  useEsiSubjects,
} from "../auth";
import {
  MERCENARY_TACTICAL_OPERATIONS_SCOPE,
  MERCENARY_TACTICAL_OPERATIONS_STALE_TIME_MS,
} from "./constants";

/** One operation, merged across every character whose listing includes it. */
export interface MercenaryTacticalOperation {
  operationId: string;
  mercenaryDenId: number;
  /**
   * The characters whose listing includes this operation, in the order they
   * were queried. The first one is the character its details were read
   * through.
   */
  characterIds: number[];
  /** Absent while the details are loading, or if reading them failed. */
  details?: MercenaryTacticalOperationDetails;
}

/** A failed request, attributed to the character that made it. */
export interface MercenaryTacticalOperationError {
  characterId: number;
  /**
   * The operation whose details failed. Absent when the character's listing
   * failed, in which case none of its operations are known.
   */
  operationId?: string;
  error: ResponseErrorConfig<Error>;
}

export interface CharactersMercenaryTacticalOperations {
  /** Every operation listed so far, each once, in listing order. */
  operations: MercenaryTacticalOperation[];
  /** The characters that were queried. */
  characterIds: number[];
  /**
   * Requested characters that could not be queried: not logged in, their
   * session expired, or they never granted the scope. A caller can offer to
   * sign them in again rather than show them as having no operations.
   */
  unavailableCharacterIds: number[];
  /**
   * Characters whose listing, or the details of any operation it lists, has
   * not settled yet. A caller showing only some characters checks these
   * rather than `isPending`, and is not held up by one it is not showing.
   */
  pendingCharacterIds: number[];
  /** True while any request is on its first load. */
  isLoading: boolean;
  /**
   * True until everything has settled — including before the persisted auth
   * store has rehydrated, when no character is known yet, so a caller keying
   * an empty state off it does not flash one on every page load.
   */
  isPending: boolean;
  isError: boolean;
  errors: MercenaryTacticalOperationError[];
  /** Refetch every listing and every operation's details. */
  refetch: () => void;
}

type ListingResponse =
  GetCharactersMercenaryTacticalOperationsListingQueryResponse;

/**
 * Module-level so its identity is stable across renders: React Query only
 * re-runs `combine` when the results or the function itself change.
 */
function combineResults<TData>(
  results: UseQueryResult<ResponseConfig<TData>, ResponseErrorConfig<Error>>[],
) {
  return {
    data: results.map((result) => result.data?.data),
    pending: results.map((result) => result.isPending),
    errors: results.map((result) => result.error ?? null),
    isLoading: results.some((result) => result.isLoading),
    refetch: () => results.forEach((result) => void result.refetch()),
  };
}

const combineListings = combineResults<ListingResponse>;
const combineDetails = combineResults<MercenaryTacticalOperationDetails>;

/** An operation and the subject whose token reads its details. */
interface ListedOperation {
  operationId: string;
  mercenaryDenId: number;
  characterIds: number[];
  subject: EsiSubject;
}

const SCOPES = [MERCENARY_TACTICAL_OPERATIONS_SCOPE];

/**
 * The Mercenary Tactical Operations a set of logged-in characters can see,
 * with each one's details.
 *
 * Pass `characterIds` to query only those characters; omit it to query every
 * logged-in character that granted the scope.
 *
 * ESI only lists ids, so this reads each operation's details as well — once
 * per operation rather than once per character listing it, through the first
 * character that does. A character whose read of it is already cached keeps
 * it, so a listing that lands late does not move the read to another
 * character and fetch it again. Every listing and every operation is its own query, so
 * the cache is shared with {@link useCharacterMercenaryTacticalOperations} and
 * {@link useCharacterMercenaryTacticalOperation}, and a failure affects only
 * the character or operation it belongs to.
 */
export function useCharactersMercenaryTacticalOperations(
  characterIds?: readonly number[],
): CharactersMercenaryTacticalOperations {
  const hasHydrated = useAuthStoreHasHydrated();
  const loggedInCharacterIds = useAuthenticatedCharacterIds();
  const subjects = useEsiSubjects({ kind: "character", scopes: SCOPES });
  const queryClient = useQueryClient();

  // Keyed by content, so a caller passing a fresh array on every render does
  // not rebuild every query.
  const idsKey = characterIds?.join(",");
  const requestedIds = useMemo(() => {
    if (idsKey === undefined) return undefined;
    if (idsKey === "") return [];
    return [...new Set(idsKey.split(",").map(Number))];
  }, [idsKey]);

  const selectedSubjects = useMemo(() => {
    if (requestedIds === undefined) return subjects;
    const wanted = new Set(requestedIds);
    return subjects.filter((subject) => wanted.has(subject.id));
  }, [subjects, requestedIds]);

  const unavailableCharacterIds = useMemo(() => {
    const queried = new Set(selectedSubjects.map((subject) => subject.id));
    return (requestedIds ?? loggedInCharacterIds).filter(
      (characterId) => !queried.has(characterId),
    );
  }, [selectedSubjects, requestedIds, loggedInCharacterIds]);

  const listingQueries = useMemo(
    () =>
      selectedSubjects.map((subject) => ({
        ...getCharactersMercenaryTacticalOperationsListingQueryOptions(
          subject.id,
          subject.authHeaders,
        ),
        staleTime: MERCENARY_TACTICAL_OPERATIONS_STALE_TIME_MS,
      })),
    [selectedSubjects],
  );
  const listings = useQueries({
    queries: listingQueries,
    combine: combineListings,
  });

  // Index-aligned with the subjects: the queries were built from them, in order.
  const listedOperations = useMemo(() => {
    const byId = new Map<string, ListedOperation>();
    selectedSubjects.forEach((subject, index) => {
      for (const operation of listings.data[index]?.operations ?? []) {
        const existing = byId.get(operation.id);
        if (existing) {
          if (!existing.characterIds.includes(subject.id)) {
            existing.characterIds.push(subject.id);
          }
          continue;
        }
        byId.set(operation.id, {
          operationId: operation.id,
          mercenaryDenId: operation.mercenary_den_id,
          characterIds: [subject.id],
          subject,
        });
      }
    });
    // Listings land in any order, so the first character to list an operation
    // can change as they do. Reading the details through another character
    // would fetch them again and blank the row meanwhile, so a character whose
    // read is already in the cache (loaded or on its way) keeps it.
    const subjectById = new Map(
      selectedSubjects.map((subject) => [subject.id, subject]),
    );
    for (const operation of byId.values()) {
      if (operation.characterIds.length < 2) continue;
      const cached = operation.characterIds
        .map((characterId) => subjectById.get(characterId))
        .find(
          (subject) =>
            subject !== undefined &&
            queryClient.getQueryState(
              getCharactersMercenaryTacticalOperationsDetailQueryOptions(
                operation.operationId,
                subject.id,
                subject.authHeaders,
              ).queryKey,
            ) !== undefined,
        );
      if (cached) operation.subject = cached;
    }
    return [...byId.values()];
  }, [selectedSubjects, listings.data, queryClient]);

  const detailQueries = useMemo(
    () =>
      listedOperations.map(({ operationId, subject }) => ({
        ...getCharactersMercenaryTacticalOperationsDetailQueryOptions(
          operationId,
          subject.id,
          subject.authHeaders,
        ),
        staleTime: MERCENARY_TACTICAL_OPERATIONS_STALE_TIME_MS,
      })),
    [listedOperations],
  );
  const details = useQueries({
    queries: detailQueries,
    combine: combineDetails,
  });

  // Index-aligned with listedOperations, for the same reason.
  const operations = useMemo<MercenaryTacticalOperation[]>(
    () =>
      listedOperations.map((operation, index) => {
        const entry: MercenaryTacticalOperation = {
          operationId: operation.operationId,
          mercenaryDenId: operation.mercenaryDenId,
          characterIds: operation.characterIds,
        };
        const detail = details.data[index];
        if (detail) entry.details = detail;
        return entry;
      }),
    [listedOperations, details.data],
  );

  const errors = useMemo<MercenaryTacticalOperationError[]>(
    () => [
      ...selectedSubjects.flatMap((subject, index) => {
        const error = listings.errors[index];
        return error ? [{ characterId: subject.id, error }] : [];
      }),
      ...listedOperations.flatMap((operation, index) => {
        const error = details.errors[index];
        return error
          ? [
              {
                characterId: operation.subject.id,
                operationId: operation.operationId,
                error,
              },
            ]
          : [];
      }),
    ],
    [selectedSubjects, listings.errors, listedOperations, details.errors],
  );

  const pendingCharacterIds = useMemo(() => {
    const pending = new Set<number>();
    selectedSubjects.forEach((subject, index) => {
      if (listings.pending[index]) pending.add(subject.id);
    });
    listedOperations.forEach((operation, index) => {
      if (!details.pending[index]) return;
      for (const characterId of operation.characterIds) {
        pending.add(characterId);
      }
    });
    return selectedSubjects
      .map((subject) => subject.id)
      .filter((characterId) => pending.has(characterId));
  }, [selectedSubjects, listings.pending, listedOperations, details.pending]);

  const characterIdsQueried = useMemo(
    () => selectedSubjects.map((subject) => subject.id),
    [selectedSubjects],
  );

  const { refetch: refetchListings } = listings;
  const { refetch: refetchDetails } = details;

  return {
    operations,
    characterIds: characterIdsQueried,
    unavailableCharacterIds,
    pendingCharacterIds,
    isLoading: listings.isLoading || details.isLoading,
    // Before rehydration there are no characters yet, so every query reports
    // settled-and-empty. Treat that as pending.
    isPending: !hasHydrated || pendingCharacterIds.length > 0,
    isError: errors.length > 0,
    errors,
    refetch: () => {
      refetchListings();
      refetchDetails();
    },
  };
}
