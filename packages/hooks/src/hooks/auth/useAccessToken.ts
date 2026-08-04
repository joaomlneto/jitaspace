"use client";

import { useShallow } from "zustand/shallow";

import type { CharactersCharacterIdRolesGetRolesEnum } from "@jitaspace/esi-client";
import type { ESIScope } from "@jitaspace/esi-metadata";

import type { CharacterSsoSession } from "./useAuthStore";
import { useAuthStore } from "./useAuthStore";

const TOKEN_UNAVAILABLE = {
  character: null,
  accessToken: null,
  authHeaders: {},
};

/**
 * Pick a logged-in character whose token can authorise an ESI request.
 *
 * `characterId`, `corporationId` and `allianceId` narrow *which* character is
 * eligible: corporation- and alliance-scoped ESI routes are still authenticated
 * with a character token, so the caller has to end up with a character that
 * actually belongs to the corporation/alliance being queried. Every character
 * that clears the filters is equally able to authorise the request, so the
 * first one wins.
 *
 * `roles` is accepted but not yet enforced: CharacterSsoSession.corporationRoles
 * is initialised empty and never populated (useAuthStore still has to fetch and
 * refresh them), so filtering on it would leave every role-gated endpoint with
 * no token at all.
 * Call sites still declare the roles they need, so the check can be switched on
 * here in one place once roles are actually fetched. ESI enforces them
 * server-side in the meantime.
 */
export const useAccessToken = (options: {
  characterId?: number;
  corporationId?: number;
  allianceId?: number;
  scopes?: ESIScope[];
  roles?: CharactersCharacterIdRolesGetRolesEnum[];
}): {
  character: CharacterSsoSession | null;
  accessToken: string | null;
  authHeaders: Record<string, string>;
} => {
  const { characterId, corporationId, allianceId, scopes } = options;

  const characters = useAuthStore(
    useShallow((state) =>
      Object.values(state.characters).filter(
        (character) =>
          (characterId == undefined || character.characterId == characterId) &&
          (corporationId == undefined ||
            character.corporationId == corporationId) &&
          (allianceId == undefined || character.allianceId == allianceId) &&
          (scopes ?? []).every((requiredScope) =>
            character.accessTokenPayload.scp.includes(requiredScope),
          ),
      ),
    ),
  );

  // Check if character is logged in
  if (!characters[0]) return TOKEN_UNAVAILABLE;

  return {
    character: characters[0],
    accessToken: characters[0].accessToken,
    authHeaders: { Authorization: `Bearer ${characters[0].accessToken}` },
  };
};
