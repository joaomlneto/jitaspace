import { GetCharactersCharacterIdRolesQueryResponseRoles } from "@jitaspace/esi-client";
import { ESIScope } from "@jitaspace/esi-metadata";

import { CharacterSsoSession, useAuthStore } from "./useAuthStore";


const TOKEN_UNAVAILABLE = {
  character: null,
  accessToken: null,
  authHeaders: {},
};

export const useAccessToken = (options: {
  characterId?: number;
  corporationId?: number;
  allianceId?: number;
  scopes?: ESIScope[];
  roles?: GetCharactersCharacterIdRolesQueryResponseRoles[];
}): {
  character: CharacterSsoSession | null;
  accessToken: string | null;
  authHeaders: Record<string, string>;
} => {
  const { characterId, corporationId, allianceId, scopes, roles } = options;
  // TODO: Filter by corporationId, allianceId, roles

  const characters = useAuthStore((state) =>
    Object.values(state.characters).filter(
      (character) =>
        (characterId == undefined || character.characterId == characterId) &&
        (scopes ?? []).every(
          (requiredScope) =>
            character.accessTokenPayload?.scp?.includes(requiredScope),
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
