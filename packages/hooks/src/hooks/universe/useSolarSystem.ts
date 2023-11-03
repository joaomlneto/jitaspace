import {
  GetUniverseSystemsSystemIdQueryResponse,
  useGetUniverseSystemsSystemId,
} from "@jitaspace/esi-client";

export type SolarSystem = GetUniverseSystemsSystemIdQueryResponse;

export const useSolarSystem = useGetUniverseSystemsSystemId;
