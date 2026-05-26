"use client";

import {
  useGetCharactersCharacterIdImplants,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export const useCharacterImplants = (characterId: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-clones.read_implants.v1"],
  });

  return {
    hasToken: !!accessToken,
    ...useGetCharactersCharacterIdImplants(
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
