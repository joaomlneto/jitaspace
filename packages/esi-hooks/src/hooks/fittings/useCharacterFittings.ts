import { useGetCharactersCharacterIdFittings } from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";


export const useCharacterFittings = () => {
  const { characterId, isTokenValid, scopes, accessToken } =
    useEsiClientContext();

  return useGetCharactersCharacterIdFittings(
    characterId ?? 0,
    { token: accessToken },
    {},
    {
      query: {
        enabled:
          isTokenValid &&
          !!characterId &&
          scopes.includes("esi-fittings.read_fittings.v1"),
      },
    },
  );
};
