"use client";

import type { GetWarsWarIdQueryResponse } from "@jitaspace/esi-client";

export { useGetWarsWarId as useWar } from "@jitaspace/esi-client";

export type War = GetWarsWarIdQueryResponse;
