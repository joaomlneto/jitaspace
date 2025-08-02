"use client";

import {
  GetWarsWarIdQueryResponse,
  useGetWarsWarIdKillmails,
} from "@jitaspace/esi-client";

export type War = GetWarsWarIdQueryResponse;

export const useWarKillmails = useGetWarsWarIdKillmails;
