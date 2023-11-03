import {
  GetCharactersCharacterIdQueryResponse,
  useGetCharactersCharacterId,
} from "@jitaspace/esi-client";

export type ESICharacterPublicInformation =
  GetCharactersCharacterIdQueryResponse;

export const useEsiCharacter = useGetCharactersCharacterId;
