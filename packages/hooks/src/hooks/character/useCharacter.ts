import {
  GetCharactersCharacterIdQueryResponse,
  useGetCharactersCharacterId,
} from "@jitaspace/esi-client";

export type Character = GetCharactersCharacterIdQueryResponse;

export const useCharacter = useGetCharactersCharacterId;
