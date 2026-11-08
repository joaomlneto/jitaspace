"use client";

import type {
  CharactersAccessListsDetail,
  CharactersAccessListsDetailCharacterentryAccessEnum,
} from "@jitaspace/esi-client";
import { useGetCharactersAccessListsDetail } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { ACCESS_LISTS_SCOPE } from "./useCharacterAccessLists";

export type AccessListDetail = CharactersAccessListsDetail;

/**
 * What an access list grants one member. The same five values for characters,
 * corporations and alliances, although only characters can be a Manager or an
 * Admin.
 */
export type AccessListAccess =
  CharactersAccessListsDetailCharacterentryAccessEnum;

/**
 * One access list's name, description and membership, read with the given
 * character's token.
 *
 * ESI only answers for a character that manages the list (a Manager or Admin
 * of it), so `characterId` should be one that {@link useCharacterAccessLists}
 * returned the list for.
 */
export const useCharacterAccessList = (
  characterId?: number,
  accessListId?: number,
) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: [ACCESS_LISTS_SCOPE],
  });

  return {
    // As in useCharacterAccessLists: no character, no token of its own.
    hasToken: !!characterId && accessToken !== null,
    // The generated hook takes the list id first: the spec orders the path
    // parameters alphabetically.
    ...useGetCharactersAccessListsDetail(
      accessListId ?? 0,
      characterId ?? 0,
      { ...authHeaders },
      {
        query: {
          enabled: !!characterId && !!accessListId && accessToken !== null,
        },
      },
    ),
  };
};
