import { useGetCharactersCharacterIdNotifications } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";


export const useEsiCharacterNotifications = (characterId?: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-characters.read_notifications.v1"],
  });
  return useGetCharactersCharacterIdNotifications(
    characterId ?? 0,
    {},
    { ...authHeaders },
    {
      query: {
        enabled: characterId !== null && accessToken !== null,
      },
    },
  );
};
