"use client";

import {
  GetUniverseRegionsRegionIdQueryResponse,
  useGetUniverseRegionsRegionId,
} from "@jitaspace/esi-client";

export type Region = GetUniverseRegionsRegionIdQueryResponse;

export const useRegion = useGetUniverseRegionsRegionId;
