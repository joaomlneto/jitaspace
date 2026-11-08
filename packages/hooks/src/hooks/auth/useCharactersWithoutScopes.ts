"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/shallow";

import type { ESIScope } from "@jitaspace/esi-metadata";

import { useAuthStore } from "./useAuthStore";

/** A logged-in character that cannot be used for some feature yet. */
export interface CharacterWithoutScopes {
  characterId: number;
  name: string;
  /** What it granted when it last signed in, to ask for again with the rest. */
  grantedScopes: ESIScope[];
  /** Signed in, but its session ended: it has to sign in again either way. */
  sessionExpired: boolean;
}

/**
 * The scopes a token carries. Typed as a list, but EVE's JWT writes a lone
 * scope as a plain string, and spreading that would split it into letters.
 */
function grantedScopesOf(scp: ESIScope[] | ESIScope | undefined): ESIScope[] {
  if (Array.isArray(scp)) return scp;
  return scp ? [scp] : [];
}

/**
 * The logged-in characters that have not granted every one of `scopes`, or
 * whose session has expired: the ones a multi-character page silently leaves
 * out. A page names them so a missing character reads as "not shared" rather
 * than as a bug, and asks them to sign in again with the scopes added.
 */
export const useCharactersWithoutScopes = (
  scopes: readonly ESIScope[],
): CharacterWithoutScopes[] => {
  // The selector returns store-owned objects only, so the snapshot stays
  // stable between renders; the derived entries are built outside it.
  const characters = useAuthStore(
    useShallow((state) =>
      Object.values(state.characters).filter((character) => {
        const granted = grantedScopesOf(character.accessTokenPayload.scp);
        return (
          character.sessionExpired === true ||
          !scopes.every((scope) => granted.includes(scope))
        );
      }),
    ),
  );

  return useMemo(
    () =>
      characters.map((character) => ({
        characterId: character.characterId,
        name: character.accessTokenPayload.name,
        grantedScopes: grantedScopesOf(character.accessTokenPayload.scp),
        sessionExpired: character.sessionExpired === true,
      })),
    [characters],
  );
};
