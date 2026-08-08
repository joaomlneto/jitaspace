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
 * `roles` lists the roles that are ACCEPTED, not ones that must all be held: a
 * character is eligible if `corporationRoles` — read from ESI by useAuthStore —
 * contains at least one of them. That mirrors ESI's own `x-required-roles`,
 * which is an any-of list; of its 34 role-gated operations, five accept either
 * of two roles (corporation wallets take Accountant OR Junior_Accountant, and
 * Junior_Accountant is the lesser of the two, so demanding both would lock out
 * essentially everyone). An empty or omitted list means "no role needed" and
 * matches every character.
 *
 * A character whose roles have never been read has an empty list, so it matches
 * nothing and is excluded rather than tried on spec. Reading them needs
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
  const acceptedRoles = roles ?? [];

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
          // Any-of, unlike `scopes` above: no roles listed means no role is
          // needed, so the empty case has to short-circuit rather than fall
          // through to `some`, which would be false and match nobody.
          (acceptedRoles.length === 0 ||
            acceptedRoles.some((acceptedRole) =>
              character.corporationRoles.includes(acceptedRole),
            )),
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
