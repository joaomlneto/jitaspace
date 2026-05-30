"use client";

import {
  GetUniverseMoonsMoonIdQueryResponse,
  useGetUniverseMoonsMoonId,
} from "@jitaspace/esi-client";

export type Moon = GetUniverseMoonsMoonIdQueryResponse;

export const useMoon = useGetUniverseMoonsMoonId;
