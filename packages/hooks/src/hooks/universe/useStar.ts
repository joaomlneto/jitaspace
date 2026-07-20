"use client";

import type { GetUniverseStarsStarIdQueryResponse } from "@jitaspace/esi-client";

export type Star = GetUniverseStarsStarIdQueryResponse;

export { useGetUniverseStarsStarId as useStar } from "@jitaspace/esi-client";
