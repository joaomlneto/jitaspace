import {
  GetUniverseStructuresStructureIdQueryResponse,
  useGetUniverseStructuresStructureId,
} from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";

export type Structure = GetUniverseStructuresStructureIdQueryResponse;

export const useStructure = (structureId: number) => {
  const { isTokenValid, scopes, accessToken } = useEsiClientContext();
  return useGetUniverseStructuresStructureId(
    structureId,
    { token: accessToken },
    {},
    {
      query: {
        enabled:
          isTokenValid &&
          !!structureId &&
          scopes.includes("esi-universe.read_structures.v1"),
      },
    },
  );
};
