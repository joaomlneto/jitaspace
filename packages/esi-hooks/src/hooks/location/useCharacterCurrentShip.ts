import { useGetCharactersCharacterIdShip } from "@jitaspace/esi-client";
import { ESIScope } from "@jitaspace/esi-metadata";

import { useEsiClientContext } from "../useEsiClientContext";


export const useCharacterCurrentShip = () => {
  const { characterId, isTokenValid, scopes, accessToken } =
    useEsiClientContext();
  const requiredScopes: ESIScope[] = ["esi-location.read_ship_type.v1"];
  return useGetCharactersCharacterIdShip(
    characterId ?? 0,
    { token: accessToken },
    {},
    {
      query: {
        enabled:
          isTokenValid &&
          requiredScopes.every((requiredScope) =>
            scopes.includes(requiredScope),
          ),
      },
    },
  );
};
