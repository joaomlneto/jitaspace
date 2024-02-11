"use client";

import {
  GetCharactersCharacterIdSkillsQueryResponse,
  useGetCharactersCharacterIdSkills,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";


export type CharacterSkill =
  GetCharactersCharacterIdSkillsQueryResponse["skills"][number];

export const useCharacterSkills = (characterId: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-skills.read_skills.v1"],
  });

  return useGetCharactersCharacterIdSkills(
    characterId ?? 1,
    {},
    { ...authHeaders },
    {
      query: {
        enabled: !!characterId && accessToken !== null,
      },
    },
  );
};
