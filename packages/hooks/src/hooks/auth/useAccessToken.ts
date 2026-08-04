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
 * Pick the character to authorise a role-gated request with.
 *
 * A character's roles are only *known* once they have been read from ESI, which
 * needs the corporation-roles scope; `corporationRolesExpireOn` is the marker
 * that such a read succeeded. Characters whose known roles fall short are
 * excluded, but one with unknown roles is not: we cannot prove it lacks the
 * role, and excluding it would leave a user who never granted that scope with
 * no token at all for every role-gated endpoint. Known holders are tried first,
 * so a Director wins over an unknown sibling in the same corporation, and ESI
 * still enforces the roles server-side on the fallback.
 */
const pickCharacter = (
  candidates: CharacterSsoSession[],
  requiredRoles: CharactersCharacterIdRolesGetRolesEnum[],
): CharacterSsoSession | null => {
  if (requiredRoles.length === 0) return candidates[0] ?? null;

  const rolesAreKnown = (character: CharacterSsoSession) =>
    character.corporationRolesExpireOn !== undefined;

  return (
    candidates.find(
      (character) =>
        rolesAreKnown(character) &&
        requiredRoles.every((role) => character.corporationRoles.includes(role)),
    ) ??
    candidates.find((character) => !rolesAreKnown(character)) ??
    null
  );
};

/**
 * Pick a logged-in character whose token can authorise an ESI request.
 *
 * `characterId`, `corporationId` and `allianceId` narrow *which* character is
 * eligible: corporation- and alliance-scoped ESI routes are still authenticated
 * with a character token, so the caller has to end up with a character that
 * actually belongs to the corporation/alliance being queried. Every character
 * that clears those filters is equally able to authorise the request, so the
 * first one wins — except when `roles` is given, where a character known to
 * hold them is preferred (see `pickCharacter`).
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
          ),
      ),
    ),
  );

  const character = pickCharacter(characters, roles ?? []);

  // Check if character is logged in
  if (!character) return TOKEN_UNAVAILABLE;

  return {
    character,
    accessToken: character.accessToken,
    authHeaders: { Authorization: `Bearer ${character.accessToken}` },
  };
};
