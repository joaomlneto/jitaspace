"use client";

import type {
  CharactersMercenaryTacticalOperationsDetailStateEnum,
  GetCharactersMercenaryTacticalOperationsDetailQueryResponse,
} from "@jitaspace/esi-client";
import { useGetCharactersMercenaryTacticalOperationsDetail } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import {
  MERCENARY_TACTICAL_OPERATIONS_SCOPE,
  mercenaryTacticalOperationDetailsStaleTime,
} from "./constants";

export type MercenaryTacticalOperationDetails =
  GetCharactersMercenaryTacticalOperationsDetailQueryResponse;

export type MercenaryTacticalOperationState =
  CharactersMercenaryTacticalOperationsDetailStateEnum;

/**
 * The details of one Mercenary Tactical Operation, read through a character
 * whose listing includes it.
 */
export const useCharacterMercenaryTacticalOperation = (
  characterId?: number,
  operationId?: string,
) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: [MERCENARY_TACTICAL_OPERATIONS_SCOPE],
  });

  // The generated hook takes the operation first: ESI declares the path
  // parameters in that order.
  return useGetCharactersMercenaryTacticalOperationsDetail(
    operationId ?? "",
    characterId ?? 0,
    { ...authHeaders },
    {
      query: {
        enabled:
          characterId !== undefined && !!operationId && accessToken !== null,
        staleTime: mercenaryTacticalOperationDetailsStaleTime,
      },
    },
  );
};
