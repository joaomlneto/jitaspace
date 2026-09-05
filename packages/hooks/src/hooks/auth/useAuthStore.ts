"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { EveSsoAccessTokenPayload } from "@jitaspace/auth-utils";
import type {
  CharactersAffiliationPost,
  CharactersCharacterIdRolesGetRolesEnum,
} from "@jitaspace/esi-client";
import type { ESIScope } from "@jitaspace/esi-metadata";
import { getEveSsoAccessTokenPayload } from "@jitaspace/auth-utils";
import {
  getCharactersCharacterIdRoles,
  postCharactersAffiliation,
} from "@jitaspace/esi-client";

export interface CharacterSsoSession {
  accessToken: string;
  accessTokenPayload: EveSsoAccessTokenPayload;
  accessTokenExpirationDate: string;
  refreshToken: string;
  characterId: number;
  corporationId: number;
  allianceId?: number;
  corporationRoles: CharactersCharacterIdRolesGetRolesEnum[];
  /**
   * Epoch ms at which `corporationRoles` goes stale. `undefined` means the roles
   * have never been read — either the token lacks the scope, or no read has
   * succeeded yet — so they are retried on the next sweep. `useAccessToken`
   * enforces `corporationRoles` as-is, so until a read lands the character
   * authorises nothing that requires a role.
   */
  corporationRolesExpireOn?: number;
  /** Epoch ms at which `corporationId` / `allianceId` go stale. */
  affiliationExpiresOn?: number;
  /**
   * Set when EVE can no longer refresh this character's token. The session is
   * kept (not removed) so the UI can flag it visually and offer re-authentication.
   */
  sessionExpired?: boolean;
}

export interface SsoAuthState {
  characters: Record<number, CharacterSsoSession>;
  selectedCharacter: number | null;
  addCharacter: (params: {
    accessToken: string;
    refreshToken: string;
  }) => Promise<void>;
  /**
   * Re-reads whatever has expired since the last call: affiliation for every
   * character, corporation roles for the ones that granted the scope. Safe to
   * call on a timer — when nothing is stale it returns without touching the
   * store, so anything keyed on the identity of `characters` stays put.
   */
  refreshStaleCharacterData: () => Promise<void>;
  removeCharacter: (characterId: number) => void;
  markCharacterSessionExpired: (characterId: number) => void;
  selectCharacter: (characterId: number) => void;
  logout: () => void;
}

// TODO: Sync local storage: https://github.com/pmndrs/zustand/discussions/1614

// ESI caches both /characters/affiliation and /characters/{id}/roles for an
// hour (x-cache-age: 3600), so re-reading either sooner only spends error-limit
// budget on an answer that would come back from cache unchanged.
const CACHE_TTL_MS = 60 * 60 * 1000;
// A failed read is retried well before the full TTL, but not on every tick: a
// persistently failing endpoint would otherwise be hammered.
const RETRY_DELAY_MS = 5 * 60 * 1000;

const CORPORATION_ROLES_SCOPE: ESIScope =
  "esi-characters.read_corporation_roles.v1";

// The generated CharactersAffiliationPost is the whole (array) response body.
type CharacterAffiliation = CharactersAffiliationPost[number];

const hasExpired = (expiresOn: number | undefined, now: number) =>
  expiresOn === undefined || expiresOn <= now;

/**
 * Next expiry stamp for a cached read. A failure that has no earlier success to
 * fall back on leaves the stamp unset, so the next sweep retries immediately
 * instead of caching a default nobody has confirmed for a whole hour — which,
 * for roles, is the difference between retrying and locking a Director out of
 * every corporation endpoint until the TTL elapses.
 */
const nextExpiry = (
  now: number,
  succeeded: boolean,
  previous: number | undefined,
): number | undefined => {
  if (succeeded) return now + CACHE_TTL_MS;
  return previous === undefined ? undefined : now + RETRY_DELAY_MS;
};

/**
 * Bulk affiliation lookup keyed by character ID. Failures are logged and
 * swallowed, and characters ESI did not answer for are simply absent from the
 * result, so callers keep whatever they already had.
 */
const fetchAffiliations = async (
  characterIds: number[],
): Promise<Map<number, CharacterAffiliation>> => {
  if (characterIds.length === 0) return new Map();
  return postCharactersAffiliation(characterIds)
    .then(
      (res) =>
        new Map(
          res.data.map(
            (affiliation) => [affiliation.character_id, affiliation] as const,
          ),
        ),
    )
    .catch((error: unknown) => {
      console.error("Error getting character affiliation", error);
      return new Map<number, CharacterAffiliation>();
    });
};

/**
 * Corporation roles for a single character. Returns `undefined` on failure so
 * the caller keeps the roles it already had: now that `useAccessToken` filters
 * on roles, downgrading a Director to "no roles" over a transient ESI blip
 * would drop the only token that can read the corporation's endpoints.
 */
const fetchCorporationRoles = async (
  characterId: number,
  accessToken: string,
): Promise<CharactersCharacterIdRolesGetRolesEnum[] | undefined> => {
  const authHeaders: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  return getCharactersCharacterIdRoles(characterId, authHeaders)
    .then((res) => res.data.roles ?? [])
    .catch((error: unknown) => {
      console.error("Error getting character corporation roles", error);
      return undefined;
    });
};

// Guards against overlapping sweeps. Expiry stamps are only written once the
// reads settle, so a sweep firing while another is still in flight would see
// the same stale entries and duplicate every request — unbounded if ESI hangs.
let staleDataRefreshInFlight = false;

export const useAuthStore = create(
  persist<SsoAuthState>(
    (set, get) => ({
      characters: {},
      selectedCharacter: null,
      addCharacter: async ({
        accessToken,
        refreshToken,
      }: {
        accessToken: string;
        refreshToken: string;
      }) => {
        const accessTokenPayload = getEveSsoAccessTokenPayload(accessToken);
        if (accessTokenPayload == null) {
          console.error("Error getting access token payload");
          return;
        }
        const characterId = Number(accessTokenPayload.sub.split(":")[2]);
        const accessTokenExpirationDate = new Date(
          accessTokenPayload.exp * 1000,
        ).toString();
        const now = Date.now();
        const cached = get().characters[characterId];

        // Affiliation and corporation roles are best-effort enrichment. A
        // failure here must NOT discard the freshly-issued token: EVE rotates
        // the refresh token on every refresh, so dropping it would throw away
        // the only valid refresh token we have AND freeze the "last refreshed"
        // timestamp the refresh handler relies on — eventually causing a false
        // "token too old" lockout. Both reads are gated on the cached copy
        // having expired, because this runs on every token refresh (~every 20
        // minutes) while ESI caches both answers for an hour.
        const refreshAffiliation = hasExpired(
          cached?.affiliationExpiresOn,
          now,
        );
        // Without the scope ESI answers 403, so don't even ask.
        const refreshRoles =
          hasExpired(cached?.corporationRolesExpireOn, now) &&
          accessTokenPayload.scp.includes(CORPORATION_ROLES_SCOPE);
        const [affiliations, roles] = await Promise.all([
          refreshAffiliation ? fetchAffiliations([characterId]) : undefined,
          refreshRoles
            ? fetchCorporationRoles(characterId, accessToken)
            : undefined,
        ]);
        const affiliation = affiliations?.get(characterId);

        set((state) => {
          const existing = state.characters[characterId];
          return {
            ...state,
            characters: {
              ...state.characters,
              [characterId]: {
                ...existing,
                accessToken,
                accessTokenPayload,
                accessTokenExpirationDate,
                refreshToken,
                characterId,
                // A fresh token means the session is alive again; clear any
                // previously-flagged expiry (e.g. after re-authentication).
                sessionExpired: false,
                // Use freshly-fetched data when available; otherwise keep
                // whatever we already had so a transient ESI hiccup never
                // blocks the token update. A read that was attempted and failed
                // re-arms on the shorter retry delay rather than the full TTL.
                allianceId: affiliation
                  ? affiliation.alliance_id
                  : existing?.allianceId,
                corporationId: affiliation
                  ? affiliation.corporation_id
                  : (existing?.corporationId ?? 0),
                affiliationExpiresOn: refreshAffiliation
                  ? nextExpiry(
                      now,
                      affiliation !== undefined,
                      existing?.affiliationExpiresOn,
                    )
                  : existing?.affiliationExpiresOn,
                corporationRoles: roles ?? existing?.corporationRoles ?? [],
                corporationRolesExpireOn: refreshRoles
                  ? nextExpiry(
                      now,
                      roles !== undefined,
                      existing?.corporationRolesExpireOn,
                    )
                  : existing?.corporationRolesExpireOn,
              },
            },
            selectedCharacter: state.selectedCharacter ?? characterId,
          };
        });
      },
      refreshStaleCharacterData: async () => {
        if (staleDataRefreshInFlight) return;
        const now = Date.now();
        // Sessions EVE will not renew are skipped: their access token is (or is
        // about to be) rejected, so every read on their behalf is a guaranteed
        // 401 against our error budget.
        const candidates = Object.values(get().characters).filter(
          (character) => !character.sessionExpired,
        );
        const staleAffiliations = candidates
          .filter((character) =>
            hasExpired(character.affiliationExpiresOn, now),
          )
          .map((character) => character.characterId);
        const staleRoles = candidates.filter(
          (character) =>
            hasExpired(character.corporationRolesExpireOn, now) &&
            character.accessTokenPayload.scp.includes(CORPORATION_ROLES_SCOPE),
        );
        // Nothing stale: return the store untouched so subscribers keyed on the
        // identity of `characters` (the token-refresh effect) do not re-run.
        if (staleAffiliations.length === 0 && staleRoles.length === 0) return;

        staleDataRefreshInFlight = true;
        try {
          const [affiliations, roles] = await Promise.all([
            fetchAffiliations(staleAffiliations),
            Promise.all(
              staleRoles.map(async (character) => {
                const characterRoles = await fetchCorporationRoles(
                  character.characterId,
                  character.accessToken,
                );
                return [character.characterId, characterRoles] as const;
              }),
            ),
          ]);
          const rolesByCharacterId = new Map(roles);
          const affiliationRead = new Set(staleAffiliations);

          set((state) => {
            const characters = { ...state.characters };
            for (const characterId of new Set([
              ...affiliationRead,
              ...rolesByCharacterId.keys(),
            ])) {
              const character = characters[characterId];
              // Logged out while the reads were in flight.
              if (!character) continue;
              const affiliation = affiliations.get(characterId);
              const characterRoles = rolesByCharacterId.get(characterId);
              characters[characterId] = {
                ...character,
                ...(affiliation && {
                  corporationId: affiliation.corporation_id,
                  allianceId: affiliation.alliance_id,
                }),
                ...(affiliationRead.has(characterId) && {
                  affiliationExpiresOn: nextExpiry(
                    now,
                    affiliation !== undefined,
                    character.affiliationExpiresOn,
                  ),
                }),
                ...(characterRoles && { corporationRoles: characterRoles }),
                ...(rolesByCharacterId.has(characterId) && {
                  corporationRolesExpireOn: nextExpiry(
                    now,
                    characterRoles !== undefined,
                    character.corporationRolesExpireOn,
                  ),
                }),
              };
            }
            return { ...state, characters };
          });
        } finally {
          staleDataRefreshInFlight = false;
        }
      },
      removeCharacter: (characterId: number) =>
        set((state) => {
          // check if character entry does not exist
          if (!state.characters[characterId]) return state;

          const remainingCharacters = { ...state.characters };
          delete remainingCharacters[characterId];
          const remainingCharacterIds =
            Object.keys(remainingCharacters).map(Number);
          return {
            ...state,
            characters: remainingCharacters,
            selectedCharacter: remainingCharacterIds[0] ?? null,
          };
        }),
      markCharacterSessionExpired: (characterId: number) =>
        set((state) => {
          const character = state.characters[characterId];
          // Keep the character (do NOT remove it); just flag the session so the
          // UI can mark it and prompt re-authentication.
          if (!character) return state;
          // Already flagged: return the SAME state so the store does not
          // allocate a new object and notify subscribers. Otherwise the refresh
          // effect (keyed on `characters` identity) would re-run and re-attempt
          // the doomed refresh in a tight ~1s loop.
          if (character.sessionExpired) return state;
          return {
            ...state,
            characters: {
              ...state.characters,
              [characterId]: { ...character, sessionExpired: true },
            },
          };
        }),
      selectCharacter: (characterId: number) =>
        set((state) => {
          if (!state.characters[characterId]) return state;
          return {
            ...state,
            selectedCharacter: characterId,
          };
        }),
      logout: () =>
        set((state) => ({
          ...state,
          characters: {},
          selectedCharacter: null,
        })),
    }),
    {
      name: "jitaspace-auth",
      skipHydration: true,
    },
  ),
);
