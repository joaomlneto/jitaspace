"use client";

import {
  useGetCharactersCharacterIdClones,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export const useCharacterClones = (characterId: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-clones.read_clones.v1"],
  });

  return {
    hasToken: !!accessToken,
    ...useGetCharactersCharacterIdClones(
      characterId ?? 1,
      { ...authHeaders },
      {
        query: {
          enabled: !!characterId && accessToken !== null,
        },
      },
    ),
  };
};
