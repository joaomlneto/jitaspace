import { add } from "date-fns";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  EveSsoAccessTokenPayload,
  getEveSsoAccessTokenPayload,
} from "@jitaspace/auth-utils";
import {
  GetCharactersCharacterIdRolesQueryResponseRoles,
  postCharactersAffiliation,
} from "@jitaspace/esi-client";





export type CharacterSsoSession = {
  accessToken: string;
  accessTokenPayload: EveSsoAccessTokenPayload;
  accessTokenExpirationDate: string;
  refreshToken: string;
  characterId: number;
  corporationId: number;
  allianceId?: number;
  corporationRoles: GetCharactersCharacterIdRolesQueryResponseRoles[];
  corporationRolesExpireOn?: number;
};

// TODO: Update corporation roles hourly
export type SsoAuthState = {
  characters: Record<number, CharacterSsoSession>;
  selectedCharacter: number | null;
  addCharacter: (params: { accessToken: string; refreshToken: string }) => void;
  removeCharacter: (characterId: number) => void;
  selectCharacter: (characterId: number) => void;
};

// TODO: Sync local storage: https://github.com/pmndrs/zustand/discussions/1614

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
          console.log("Error getting access token payload");
          return;
        }
        const characterId = Number(accessTokenPayload.sub.split(":")[2]);
        const accessTokenExpirationDate = new Date(
          accessTokenPayload.exp * 1000,
        ).toString();
        // Get character affiliation
        const affiliation = (await postCharactersAffiliation([characterId]))
          .data[0];
        if (!affiliation) {
          console.error("Error getting character affiliation");
          return;
        }
        set((state) => {
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
                allianceId: affiliation.alliance_id,
                corporationId: affiliation.corporation_id,
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
    }),
    {
      name: "jitaspace-auth",
      skipHydration: true,
    },
  ),
);
