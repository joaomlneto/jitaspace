import {
  GetCorporationsCorporationIdQueryResponse,
  useGetCorporationsCorporationId,
} from "@jitaspace/esi-client";

export type Corporation = GetCorporationsCorporationIdQueryResponse;

export const useCorporation = useGetCorporationsCorporationId;
