import { useGetCharactersCharacterIdSkillqueue } from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";


export const useCharacterSkillQueue = () => {
  const { characterId, isTokenValid, accessToken, scopes } =
    useEsiClientContext();
  return useGetCharactersCharacterIdSkillqueue(
    characterId ?? 1,
    { token: accessToken },
    {},
    {
      query: {
        enabled:
          isTokenValid &&
          !!characterId &&
          scopes.includes("esi-skills.read_skillqueue.v1"),
      },
    },
  );
};
