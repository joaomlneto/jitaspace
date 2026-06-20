"use client";

import { add } from "date-fns";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  EveSsoAccessTokenPayload} from "@jitaspace/auth-utils";
import {
  getEveSsoAccessTokenPayload,
} from "@jitaspace/auth-utils";
import type {
  CharactersCharacterIdRolesGetRolesEnum} from "@jitaspace/esi-client";
import {
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
  corporationRolesExpireOn?: number;
}

// TODO: Update corporation roles hourly
export interface SsoAuthState {
  characters: Record<number, CharacterSsoSession>;
  selectedCharacter: number | null;
  addCharacter: (params: {
    accessToken: string;
    refreshToken: string;
  }) => Promise<void>;
  removeCharacter: (characterId: number) => void;
  selectCharacter: (characterId: number) => void;
  logout: () => void;
}

// TODO: Sync local storage: https://github.com/pmndrs/zustand/discussions/1614

export const useAuthStore = create(
  persist<SsoAuthState>(
    (set) => ({
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
        // Character affiliation is best-effort enrichment. A failure here must
        // NOT discard the freshly-issued token: EVE rotates the refresh token on
        // every refresh, so dropping it would throw away the only valid refresh
        // token we have AND freeze the "last refreshed" timestamp the refresh
        // handler relies on — eventually causing a false "token too old" lockout.
        const affiliation = await postCharactersAffiliation([characterId])
          .then((res) => res.data[0])
          .catch((error: unknown) => {
            console.error("Error getting character affiliation", error);
            return undefined;
          });
        set((state) => {
          const existing = state.characters[characterId];
          return {
            ...state,
            characters: {
              ...state.characters,
              [characterId]: {
                accessToken,
                accessTokenPayload,
                accessTokenExpirationDate,
                refreshToken,
                characterId,
                corporationRoles: [],
                // Use freshly-fetched affiliation when available; otherwise keep
                // whatever we already had so a transient ESI hiccup never blocks
                // the token update.
                allianceId: affiliation
                  ? affiliation.alliance_id
                  : existing?.allianceId,
                corporationId: affiliation
                  ? affiliation.corporation_id
                  : (existing?.corporationId ?? 0),
                affiliationExpirationDate: add(new Date(), { hours: 1 }),
              },
            },
            selectedCharacter: state.selectedCharacter ?? characterId,
          };
        });
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
