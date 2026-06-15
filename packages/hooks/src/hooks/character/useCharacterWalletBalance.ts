"use client";

import { useGetCharactersCharacterIdWallet } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { offlinePersistedQueryOptions } from "../../offlineQueryOptions";

export const useCharacterWalletBalance = (characterId?: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-wallet.read_character_wallet.v1"],
  });

  return {
    isAllowed: !!accessToken,
    ...useGetCharactersCharacterIdWallet(
      characterId ?? 0,
      { ...authHeaders },
      {
        query: {
          ...offlinePersistedQueryOptions,
          enabled: characterId !== null && accessToken !== null,
        },
      },
    ),
  };
};
