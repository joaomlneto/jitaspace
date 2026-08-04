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
 * `roles` is enforced the same way as `scopes`: a character is only eligible if
 * `corporationRoles` — read from ESI by useAuthStore — actually contains every
 * required role. A character whose roles have never been read has an empty
 * list, so it is excluded rather than tried on spec; reading them needs
 * `esi-characters.read_corporation_roles.v1`, so a character that never granted
 * that scope authorises nothing role-gated. That is deliberate: the scope is
 * not forced on anyone, and a character without it is simply treated as holding
 * no roles.
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
  const { characterId, corporationId, allianceId, scopes, roles } = options;

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
          ) &&
          (roles ?? []).every((requiredRole) =>
            character.corporationRoles.includes(requiredRole),
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
