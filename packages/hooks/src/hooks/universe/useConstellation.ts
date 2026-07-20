"use client";

import type { GetUniverseConstellationsConstellationIdQueryResponse } from "@jitaspace/esi-client";

export { useGetUniverseConstellationsConstellationId as useConstellation } from "@jitaspace/esi-client";

export type Constellation =
  GetUniverseConstellationsConstellationIdQueryResponse;
