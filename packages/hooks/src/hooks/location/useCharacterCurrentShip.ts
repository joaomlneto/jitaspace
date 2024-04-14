"use client";

import { useGetCharactersCharacterIdShip } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";


export const useCharacterCurrentShip = (characterId: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-location.read_ship_type.v1"],
  });
  return {
    hasToken: accessToken !== null,
    ...useGetCharactersCharacterIdShip(
      characterId ?? 0,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: accessToken !== null,
        },
      },
    ),
  };
};
