"use client";

import type { GetCharactersCharacterIdSkillsQueryResponse } from "@jitaspace/esi-client";
import { useGetCharactersCharacterIdSkills } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export type CharacterSkill =
  GetCharactersCharacterIdSkillsQueryResponse["skills"][number];

export const useCharacterSkills = (characterId: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-skills.read_skills.v1"],
  });

  return {
    hasToken: !!accessToken,
    ...useGetCharactersCharacterIdSkills(
      characterId,
      { ...authHeaders },
      {
        query: {
          enabled: !!characterId && accessToken !== null,
        },
      },
    ),
  };
};
