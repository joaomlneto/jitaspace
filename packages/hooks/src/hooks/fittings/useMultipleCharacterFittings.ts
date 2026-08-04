"use client";

import { getCharactersCharacterIdFittingsQueryOptions } from "@jitaspace/esi-client";

import { defineMultiEsiQuery } from "../multi";

/**
 * Fittings for every logged-in character that granted the fittings scope.
 *
 * Shares its cache with `useCharacterFittings`: both go through the same
 * generated query options, so a character rendered by both hooks is fetched
 * once.
 */
export const useMultipleCharacterFittings = defineMultiEsiQuery({
  kind: "character",
  scopes: ["esi-fittings.read_fittings.v1"],
  query: (characterId, authHeaders) =>
    getCharactersCharacterIdFittingsQueryOptions(characterId, authHeaders),
});
