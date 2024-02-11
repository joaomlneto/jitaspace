"use client";

import { useGetCharactersCharacterIdLocation } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";


export const useCharacterLocation = (characterId: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-location.read_location.v1"],
  });
  return useGetCharactersCharacterIdLocation(
    characterId ?? 0,
    {},
    { ...authHeaders },
    {
      query: {
        enabled: accessToken !== null,
      },
    },
  );
};
