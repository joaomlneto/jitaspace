"use client";

import { useGetCharactersCharacterIdFittings } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";


export const useCharacterFittings = (characterId?: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-fittings.read_fittings.v1"],
  });

  return useGetCharactersCharacterIdFittings(
    characterId ?? 0,
    {},
    { ...authHeaders },
    {
      query: {
        enabled: characterId !== undefined && accessToken !== null,
      },
    },
  );
};
