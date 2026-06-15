"use client";

import {
  GetCharactersCharacterIdWalletJournalQueryResponse,
  useGetCharactersCharacterIdWalletJournal,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { offlinePersistedQueryOptions } from "../../offlineQueryOptions";

export type CharacterWalletJournalEntry =
  GetCharactersCharacterIdWalletJournalQueryResponse[number];

export const useCharacterWalletJournal = (characterId?: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-wallet.read_character_wallet.v1"],
  });
  return useGetCharactersCharacterIdWalletJournal(
    characterId ?? 0,
    {},
    { ...authHeaders },
    {
      query: {
        ...offlinePersistedQueryOptions,
        enabled: characterId !== undefined && accessToken !== null,
      },
    },
  );
};
