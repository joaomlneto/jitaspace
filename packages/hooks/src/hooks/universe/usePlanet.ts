import {
  GetUniversePlanetsPlanetIdQueryResponse,
  useGetUniversePlanetsPlanetId,
} from "@jitaspace/esi-client";

export type Planet = GetUniversePlanetsPlanetIdQueryResponse;

export const usePlanet = useGetUniversePlanetsPlanetId;
