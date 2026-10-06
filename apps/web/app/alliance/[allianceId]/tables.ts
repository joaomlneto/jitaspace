import { useQuery } from "@tanstack/react-query";

import type { AllianceTables } from "./types";

/** The alliance's table rows, from the CDN-cached `/api/alliance/[allianceId]`. */
export function useAllianceTables(allianceId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["alliance-tables", allianceId],
    queryFn: async (): Promise<AllianceTables> => {
      const response = await fetch(`/api/alliance/${allianceId}`);
      if (!response.ok) {
        throw new Error(`Alliance ${allianceId}: HTTP ${response.status}`);
      }
      return (await response.json()) as AllianceTables;
    },
    enabled,
    staleTime: Infinity,
  });
}
