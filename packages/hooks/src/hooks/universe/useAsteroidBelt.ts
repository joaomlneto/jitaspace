"use client";

import {
  GetUniverseAsteroidBeltsAsteroidBeltIdQueryResponse,
  useGetUniverseAsteroidBeltsAsteroidBeltId,
} from "@jitaspace/esi-client";

export type AsteroidBelt = GetUniverseAsteroidBeltsAsteroidBeltIdQueryResponse;

export const useAsteroidBelt = useGetUniverseAsteroidBeltsAsteroidBeltId;
