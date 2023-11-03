import {
  GetCharactersCharacterIdSkillsQueryResponse,
  useGetCharactersCharacterIdSkills,
} from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";


export type CharacterSkill =
  GetCharactersCharacterIdSkillsQueryResponse["skills"][number];

export const useCharacterSkills = () => {
  const { characterId, isTokenValid, accessToken, scopes } =
    useEsiClientContext();

  return useGetCharactersCharacterIdSkills(
    characterId ?? 1,
    { token: accessToken },
    {},
    {
      query: {
        enabled:
          isTokenValid &&
          !!characterId &&
          scopes.includes("esi-skills.read_skills.v1"),
      },
    },
  );
};
