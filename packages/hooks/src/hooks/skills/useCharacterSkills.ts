"use client";

import {
  GetCharactersCharacterIdSkillsQueryResponse,
  useGetCharactersCharacterIdSkills,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { offlinePersistedQueryOptions } from "../../offlineQueryOptions";

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
      characterId ?? 1,
      { ...authHeaders },
      {
        query: {
          ...offlinePersistedQueryOptions,
          enabled: !!characterId && accessToken !== null,
        },
      },
    ),
  };
};
