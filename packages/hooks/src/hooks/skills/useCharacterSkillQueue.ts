"use client";

import { useGetCharactersCharacterIdSkillqueue } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export const useCharacterSkillQueue = (characterId: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-skills.read_skillqueue.v1"],
  });
  return useGetCharactersCharacterIdSkillqueue(
    characterId,
    { ...authHeaders },
    {
      query: {
        enabled: !!characterId && accessToken !== null,
      },
    },
  );
};
