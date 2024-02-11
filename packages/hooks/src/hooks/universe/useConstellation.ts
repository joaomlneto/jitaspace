"use client";

import {
  GetUniverseConstellationsConstellationIdQueryResponse,
  useGetUniverseConstellationsConstellationId,
} from "@jitaspace/esi-client";

export type Constellation =
  GetUniverseConstellationsConstellationIdQueryResponse;

export const useConstellation = useGetUniverseConstellationsConstellationId;
