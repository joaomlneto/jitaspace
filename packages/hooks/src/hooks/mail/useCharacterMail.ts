import { useGetCharactersCharacterIdMailMailId } from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";


export function useCharacterMail(messageId?: number) {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  return useGetCharactersCharacterIdMailMailId(
    characterId ?? 0,
    messageId ?? 0,
    { token: accessToken },
    {},
    {
      query: {
        enabled:
          isTokenValid &&
          !!messageId &&
          scopes.includes("esi-mail.read_mail.v1"),
      },
    },
  );
}
