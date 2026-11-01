"use client";

import type { GetCharactersCharacterIdPlanetsPlanetIdQueryResponse } from "@jitaspace/esi-client";
import { useGetCharactersCharacterIdPlanetsPlanetId } from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";
import { PLANETS_SCOPE } from "./scopes";

/** A colony's pins, links and routes. */
export type ColonyLayout = GetCharactersCharacterIdPlanetsPlanetIdQueryResponse;

/** One structure on a colony: a command center, extractor, factory, ... */
export type ColonyPin = ColonyLayout["pins"][number];

/** A link between two pins. */
export type ColonyLink = ColonyLayout["links"][number];

/** A route moving a commodity from one pin to another. */
export type ColonyRoute = ColonyLayout["routes"][number];

/**
 * The layout of one of a character's colonies: its pins (with extractor and
 * factory details and storage contents), links and routes.
 *
 * For several colonies at once, use {@link useCharacterPlanetLayouts}, which
 * shares this hook's cache entries.
 */
export const useCharacterPlanetLayout = (
  characterId?: number,
  planetId?: number,
) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: [PLANETS_SCOPE],
  });

  return {
    hasToken: accessToken !== null,
    ...useGetCharactersCharacterIdPlanetsPlanetId(
      characterId ?? 0,
      planetId ?? 0,
      { ...authHeaders },
      {
        query: {
          enabled: !!characterId && !!planetId && accessToken !== null,
        },
      },
    ),
  };
};
