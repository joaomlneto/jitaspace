"use client";

import {
  GetCorporationsCorporationIdAlliancehistoryQueryResponse,
  useGetCorporationsCorporationIdAlliancehistory,
} from "@jitaspace/esi-client";

export type CorporationAllianceHistory =
  GetCorporationsCorporationIdAlliancehistoryQueryResponse;

export const useCorporationAllianceHistory =
  useGetCorporationsCorporationIdAlliancehistory;
