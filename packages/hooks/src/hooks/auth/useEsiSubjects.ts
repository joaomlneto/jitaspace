"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/shallow";

import type { CharactersCharacterIdRolesGetRolesEnum } from "@jitaspace/esi-client";
import type { ESIScope } from "@jitaspace/esi-metadata";

import { useAuthStore } from "./useAuthStore";

/** The kind of entity an authenticated ESI route is keyed on. */
export type EsiSubjectKind = "character" | "corporation" | "alliance";

export interface EsiSubject {
  /** `character_id`, `corporation_id` or `alliance_id`, depending on the kind. */
  id: number;
  /** The character whose token authorises requests for this subject. */
  characterId: number;
  authHeaders: Record<string, string>;
}

/**
 * Enumerate every entity of a given kind that the logged-in characters can
 * reach, together with a token that authorises requests for it.
 *
 * Corporation- and alliance-scoped ESI routes are still authenticated with a
 * character token, so the only thing that varies between kinds is how subjects
 * are enumerated and which character signs for each one. Corporations and
 * alliances are deduplicated — several characters in the same corporation yield
 * one subject, since any of their tokens authorises the request equally well.
 *
 * `roles` is accepted but not yet enforced, matching useAccessToken:
 * CharacterSsoSession.corporationRoles is initialised empty and never populated,
 * so filtering on it would yield no subjects at all for role-gated endpoints.
 * ESI enforces roles server-side in the meantime.
 */
export const useEsiSubjects = (options: {
  kind: EsiSubjectKind;
  scopes?: ESIScope[];
  roles?: CharactersCharacterIdRolesGetRolesEnum[];
}): EsiSubject[] => {
  const { kind, scopes } = options;

  // The selector returns store-owned objects only, so snapshot identity stays
  // stable; the derived subjects are built outside it.
  const characters = useAuthStore(
    useShallow((state) =>
      Object.values(state.characters).filter((character) =>
        (scopes ?? []).every((requiredScope) =>
          character.accessTokenPayload.scp.includes(requiredScope),
        ),
      ),
    ),
  );

  return useMemo(() => {
    const subjects = new Map<number, EsiSubject>();

    for (const character of characters) {
      const id =
        kind === "character"
          ? character.characterId
          : kind === "corporation"
            ? character.corporationId
            : character.allianceId;

      // A character with no alliance yields no alliance subject.
      if (id == undefined) continue;
      // First eligible character wins; the rest authorise the same request.
      if (subjects.has(id)) continue;

      subjects.set(id, {
        id,
        characterId: character.characterId,
        authHeaders: { Authorization: `Bearer ${character.accessToken}` },
      });
    }

    return [...subjects.values()];
  }, [characters, kind]);
};
