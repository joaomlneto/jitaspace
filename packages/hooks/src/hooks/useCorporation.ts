"use client";

import type { GetCorporationsCorporationIdQueryResponse } from "@jitaspace/esi-client";

export type Corporation = GetCorporationsCorporationIdQueryResponse;

export { useGetCorporationsCorporationId as useCorporation } from "@jitaspace/esi-client";
