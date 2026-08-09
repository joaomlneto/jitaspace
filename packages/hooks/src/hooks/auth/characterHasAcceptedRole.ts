import type { CharactersCharacterIdRolesGetRolesEnum } from "@jitaspace/esi-client";

import type { CharacterSsoSession } from "./useAuthStore";

/**
 * Whether a character may authorise a request that is gated on corporation
 * roles.
 *
 * `acceptedRoles` lists the roles that are ACCEPTED, not ones that must all be
 * held: holding any one of them is enough. That mirrors ESI's own
 * `x-required-roles`, which is an any-of list — of its role-gated operations,
 * five accept either of two roles (corporation wallets take Accountant OR
 * Junior_Accountant, and Junior_Accountant is the lesser of the two, so
 * demanding both would lock out essentially everyone).
 *
 * The empty case has to short-circuit rather than fall through to `some`:
 * `[].some()` is false and would match nobody, whereas an omitted or empty list
 * means "no role needed".
 *
 * A character whose roles have never been read has an empty list, so it matches
 * nothing and is excluded rather than tried on spec. Reading them needs
 * `esi-characters.read_corporation_roles.v1`, which is deliberately not forced
 * on anyone.
 *
 * Shared by useAccessToken and useEsiSubjects: all role-gated ESI routes are
 * corporation-scoped, and under a multi-subject fan-out a divergence between
 * the two would mean one 403 per corporation on each of those routes, against
 * an API that rate-limits on error rate.
 */
export function characterHasAcceptedRole(
  character: CharacterSsoSession,
  acceptedRoles: CharactersCharacterIdRolesGetRolesEnum[] | undefined,
): boolean {
  if (!acceptedRoles?.length) return true;
  return acceptedRoles.some((acceptedRole) =>
    character.corporationRoles.includes(acceptedRole),
  );
}
