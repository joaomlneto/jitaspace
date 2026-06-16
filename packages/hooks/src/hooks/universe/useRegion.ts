"use client";

import type { GetUniverseRegionsRegionIdQueryResponse } from "@jitaspace/esi-client";

export type Region = GetUniverseRegionsRegionIdQueryResponse;

export { useGetUniverseRegionsRegionId as useRegion } from "@jitaspace/esi-client";
