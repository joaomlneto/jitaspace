import { useGetCharactersCharacterIdAttributes } from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";


export const useCharacterAttributes = () => {
  const { characterId, isTokenValid, scopes, accessToken } =
    useEsiClientContext();

  return useGetCharactersCharacterIdAttributes(
    characterId ?? 0,
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
