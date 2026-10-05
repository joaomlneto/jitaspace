import { useQuery } from "@tanstack/react-query";

import type { CorporationTables } from "./types";

/** The corporation's table rows, from the CDN-cached `/api/corporation/[id]`. */
export function useCorporationTables(corporationId: number, enabled: boolean) {
  return useQuery({
    queryKey: ["corporation-tables", corporationId],
    queryFn: async (): Promise<CorporationTables> => {
      const response = await fetch(`/api/corporation/${corporationId}`);
      if (!response.ok) {
        throw new Error(
          `Corporation ${corporationId}: HTTP ${response.status}`,
        );
      }
      return (await response.json()) as CorporationTables;
    },
    enabled,
    staleTime: Infinity,
  });
}
