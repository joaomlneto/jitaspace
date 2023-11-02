import {
  GetUniverseStationsStationIdQueryResponse,
  useGetUniverseStationsStationId,
} from "@jitaspace/esi-client";

export type Station = GetUniverseStationsStationIdQueryResponse;

export const useStation = useGetUniverseStationsStationId;
