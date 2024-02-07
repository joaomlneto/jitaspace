import { useGetCharactersCharacterIdOnline } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";


export const useCharacterOnlineStatus = (characterId: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-location.read_online.v1"],
  });
  return useGetCharactersCharacterIdOnline(
    characterId ?? 0,
    {},
    { ...authHeaders },
    {
      query: {
        enabled: accessToken !== null,
      },
    },
  );
};
