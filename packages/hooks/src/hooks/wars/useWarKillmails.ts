"use client";

import {
  GetWarsWarIdKillmailsQueryResponse,
  useGetWarsWarIdKillmails,
} from "@jitaspace/esi-client";

export type WarKillmail = GetWarsWarIdKillmailsQueryResponse;

export const useWarKillmails = useGetWarsWarIdKillmails;
