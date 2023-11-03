import {
  GetCharactersCharacterIdWalletJournalQueryResponse,
  useGetCharactersCharacterIdWalletJournal,
} from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";

export type CharacterWalletJournalEntry =
  GetCharactersCharacterIdWalletJournalQueryResponse[number];

export const useCharacterWalletJournal = () => {
  const { characterId, scopes, isTokenValid, accessToken } =
    useEsiClientContext();
  return useGetCharactersCharacterIdWalletJournal(
    characterId ?? 0,
    { token: accessToken },
    {},
    {
      query: {
        enabled:
          isTokenValid &&
          characterId !== undefined &&
          scopes.includes("esi-wallet.read_character_wallet.v1"),
      },
    },
  );
};
