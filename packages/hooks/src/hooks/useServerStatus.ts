"use client";

import { useGetStatus } from "@jitaspace/esi-client";

export const useServerStatus = (
  headers: Parameters<typeof useGetStatus>[0] = {
    "X-Compatibility-Date": "2025-12-16",
  },
  options?: Parameters<typeof useGetStatus>[1],
) => useGetStatus(headers, options);
