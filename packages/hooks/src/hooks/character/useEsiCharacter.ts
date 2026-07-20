"use client";

import type { GetCharactersDetailQueryResponse } from "@jitaspace/esi-client";

export type ESICharacterPublicInformation = GetCharactersDetailQueryResponse;

export { useGetCharactersDetail as useEsiCharacter } from "@jitaspace/esi-client";
