"use client";

import { GetUniversePlanetsPlanetIdQueryResponse } from "@jitaspace/esi-client";

export type Planet = GetUniversePlanetsPlanetIdQueryResponse;

export { useGetUniversePlanetsPlanetId as usePlanet } from "@jitaspace/esi-client";
