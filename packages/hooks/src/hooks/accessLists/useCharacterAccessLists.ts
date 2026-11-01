"use client";

import { useGetCharactersAccessListsListing } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export const ACCESS_LISTS_SCOPE = "esi-access.read_lists.v1";

/**
 * The access lists one character is a Manager or Admin of.
 *
 * ESI lists ids only: fetch each list's name and membership with
 * {@link useCharacterAccessList}, or use {@link useCharactersAccessListDetails}
 * for several characters at once.
 */
export const useCharacterAccessLists = (
  characterId?: number,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: [ACCESS_LISTS_SCOPE],
  });

  return {
    // Without a character, useAccessToken matches whichever one holds the
    // scope; that token is not this (absent) character's.
    hasToken: !!characterId && accessToken !== null,
    ...useGetCharactersAccessListsListing(
      characterId ?? 0,
      { ...authHeaders },
      {
        query: {
          enabled: enabled && !!characterId && accessToken !== null,
        },
      },
    ),
  };
};
