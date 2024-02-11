"use client";

import {
  GetWarsWarIdQueryResponse,
  useGetWarsWarId,
} from "@jitaspace/esi-client";

export type War = GetWarsWarIdQueryResponse;

export const useWar = useGetWarsWarId;
