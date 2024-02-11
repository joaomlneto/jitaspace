"use client";

import {
  GetUniverseTypesTypeIdQueryResponse,
  useGetUniverseTypesTypeId,
} from "@jitaspace/esi-client";

export type Type = GetUniverseTypesTypeIdQueryResponse;

export const useType = useGetUniverseTypesTypeId;
