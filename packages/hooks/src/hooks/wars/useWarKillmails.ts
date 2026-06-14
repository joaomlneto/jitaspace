"use client";

import { GetWarsWarIdKillmailsQueryResponse } from "@jitaspace/esi-client";

export { useGetWarsWarIdKillmails as useWarKillmails } from "@jitaspace/esi-client";

export type WarKillmail = GetWarsWarIdKillmailsQueryResponse;
