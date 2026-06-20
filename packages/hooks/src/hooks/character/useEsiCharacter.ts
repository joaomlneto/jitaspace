"use client";

import type { GetCharactersCharacterIdQueryResponse } from "@jitaspace/esi-client";

export type ESICharacterPublicInformation =
  GetCharactersCharacterIdQueryResponse;

export { useGetCharactersCharacterId as useEsiCharacter } from "@jitaspace/esi-client";
