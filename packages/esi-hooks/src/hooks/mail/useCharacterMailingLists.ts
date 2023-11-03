import { useGetCharactersCharacterIdMailLists } from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";


export function useCharacterMailingLists() {
  const { characterId, isTokenValid, accessToken } = useEsiClientContext();

  return useGetCharactersCharacterIdMailLists(
    characterId ?? 1,
    { token: accessToken },
    {},
    {
      query: {
        enabled: isTokenValid,
      },
    },
  );
}
