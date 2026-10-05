"use client";

import { useGetCharactersCharacterIdWallet } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

/**
 * @param options.enabled - false holds the request while still reporting
 *   `isAllowed`. Default true.
 */
export const useCharacterWalletBalance = (
  characterId?: number,
  { enabled = true }: { enabled?: boolean } = {},
) => {
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
          enabled: enabled && characterId !== undefined && accessToken !== null,
        },
      },
    ),
  };
};
