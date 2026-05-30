"use client";

import {
  GetUniverseStargatesStargateIdQueryResponse,
  useGetUniverseStargatesStargateId,
} from "@jitaspace/esi-client";

export type Stargate = GetUniverseStargatesStargateIdQueryResponse;

export const useStargate = useGetUniverseStargatesStargateId;
