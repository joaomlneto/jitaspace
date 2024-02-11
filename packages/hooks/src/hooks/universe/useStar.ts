"use client";

import {
  GetUniverseStarsStarIdQueryResponse,
  useGetUniverseStarsStarId,
} from "@jitaspace/esi-client";

export type Star = GetUniverseStarsStarIdQueryResponse;

export const useStar = useGetUniverseStarsStarId;
