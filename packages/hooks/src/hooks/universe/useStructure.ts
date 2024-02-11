"use client";

import {
  GetUniverseStructuresStructureIdQueryResponse,
  useGetUniverseStructuresStructureId,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export type Structure = GetUniverseStructuresStructureIdQueryResponse;

export const useStructure = (structureId: number, characterId?: number) => {
  const { accessToken, authHeaders } = useAccessToken({
    characterId,
    scopes: ["esi-universe.read_structures.v1"],
  });
  return useGetUniverseStructuresStructureId(
    structureId,
    {},
    { ...authHeaders },
    {
      query: {
        enabled: !!structureId && accessToken !== null,
      },
    },
  );
};
