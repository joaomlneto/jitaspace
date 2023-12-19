import { useGetCharactersCharacterIdMailLists } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";


export function useCharacterMailingLists(characterId: number) {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-mail.read_mail.v1"],
  });

  return useGetCharactersCharacterIdMailLists(
    characterId ?? 1,
    {},
    { ...authHeaders },
    {
      query: {
        enabled: accessToken !== null,
      },
    },
  );
}
