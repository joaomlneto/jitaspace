"use client";

import type { GetCharactersMercenaryTacticalOperationsListingQueryResponse } from "@jitaspace/esi-client";
import { useGetCharactersMercenaryTacticalOperationsListing } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import {
  MERCENARY_TACTICAL_OPERATIONS_SCOPE,
  MERCENARY_TACTICAL_OPERATIONS_STALE_TIME_MS,
} from "./constants";

/** One entry of a character's listing: the operation's id and its den. */
export type MercenaryTacticalOperationSummary =
  GetCharactersMercenaryTacticalOperationsListingQueryResponse["operations"][number];

/**
 * The Mercenary Tactical Operations one character can see.
 *
 * The listing names each operation and the Mercenary Den offering it, and
 * nothing else — its state, dungeon and expiry come from
 * {@link useCharacterMercenaryTacticalOperation}.
 */
export const useCharacterMercenaryTacticalOperations = (
  characterId?: number,
) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: [MERCENARY_TACTICAL_OPERATIONS_SCOPE],
  });

  return useGetCharactersMercenaryTacticalOperationsListing(
    characterId ?? 0,
    { ...authHeaders },
    {
      query: {
        enabled: characterId !== undefined && accessToken !== null,
        staleTime: MERCENARY_TACTICAL_OPERATIONS_STALE_TIME_MS,
      },
    },
  );
};
