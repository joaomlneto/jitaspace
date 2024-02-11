"use client";

import { useGetCharactersCharacterIdMailMailId } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";


export function useCharacterMail(characterId: number, messageId?: number) {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-mail.read_mail.v1"],
  });

  return useGetCharactersCharacterIdMailMailId(
    characterId ?? 0,
    messageId ?? 0,
    {},
    { ...authHeaders },
    {
      query: {
        enabled: !!messageId && accessToken !== null,
      },
    },
  );
}
