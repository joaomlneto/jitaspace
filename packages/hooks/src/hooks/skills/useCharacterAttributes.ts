"use client";

import { useGetCharactersCharacterIdAttributes } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";


export const useCharacterAttributes = (characterId: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-skills.read_skills.v1"],
  });

  return useGetCharactersCharacterIdAttributes(
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
