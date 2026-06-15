"use client";

import { useGetCharactersCharacterIdMailMailId } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { offlinePersistedQueryOptions } from "../../offlineQueryOptions";

export function useCharacterMail(characterId: number, messageId?: number) {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-mail.read_mail.v1"],
  });

  return useGetCharactersCharacterIdMailMailId(
    characterId ?? 0,
    messageId ?? 0,
    { ...authHeaders },
    {
      query: {
        ...offlinePersistedQueryOptions,
        enabled: !!messageId && accessToken !== null,
      },
    },
  );
}
