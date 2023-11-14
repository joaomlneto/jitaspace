import { useGetCharactersCharacterIdNotifications } from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";


export const useEsiCharacterNotifications = () => {
  const { characterId, isTokenValid, scopes, accessToken } =
    useEsiClientContext();
  return useGetCharactersCharacterIdNotifications(
    characterId ?? 0,
    { token: accessToken },
    {},
    {
      query: {
        enabled:
          isTokenValid &&
          characterId !== undefined &&
          scopes.includes("esi-characters.read_notifications.v1"),
      },
    },
  );
};
