"use client";

import { useMemo } from "react";

import {
  GetCharactersCharacterIdLoyaltyPointsQueryResponse,
  useGetCharactersCharacterIdLoyaltyPoints,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export type CharacterLoyaltyPoints =
  GetCharactersCharacterIdLoyaltyPointsQueryResponse[number];

export const useCharacterLoyaltyPoints = (characterId: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-characters.read_loyalty.v1"],
  });

  const query = useGetCharactersCharacterIdLoyaltyPoints(
    characterId ?? 1,
    { ...authHeaders },
    {
      query: {
        enabled: !!characterId && accessToken !== null,
      },
    },
  );

  const loyaltyPointsMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const entry of query.data?.data ?? []) {
      map[entry.corporation_id] = entry.loyalty_points;
    }
    return map;
  }, [query.data]);

  return {
    hasToken: !!accessToken,
    loyaltyPointsMap,
    ...query,
  };
};
