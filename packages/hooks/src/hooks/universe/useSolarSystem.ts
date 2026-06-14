"use client";

import { GetUniverseSystemsSystemIdQueryResponse } from "@jitaspace/esi-client";

export type SolarSystem = GetUniverseSystemsSystemIdQueryResponse;

export { useGetUniverseSystemsSystemId as useSolarSystem } from "@jitaspace/esi-client";
