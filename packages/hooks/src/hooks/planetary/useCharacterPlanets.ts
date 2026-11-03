"use client";

import type { GetCharactersCharacterIdPlanetsQueryResponse } from "@jitaspace/esi-client";
import { useGetCharactersCharacterIdPlanets } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { PLANETS_SCOPE } from "./scopes";

/** One of a character's planetary colonies, as ESI lists it. */
export type CharacterColony =
  GetCharactersCharacterIdPlanetsQueryResponse[number];

/**
 * A character's planetary colonies.
 *
 * For several characters at once, use `useMultipleCharacterPlanets` (every
 * logged-in character, or `{ subjectIds }` for a chosen few): it shares this
 * hook's cache entries.
 *
 * @param options.enabled - false holds the request while still reporting
 *   `hasToken`. Default true.
 */
export const useCharacterPlanets = (
  characterId?: number,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: [PLANETS_SCOPE],
  });

  return {
    hasToken: accessToken !== null,
    ...useGetCharactersCharacterIdPlanets(
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
