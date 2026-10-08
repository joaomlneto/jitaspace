import { useQuery } from "@tanstack/react-query";

import type { IncursionHistory, IncursionLookups } from "./types";

/** The History tab's data, from the CDN-cached `/api/incursions/history`. */
export function useIncursionHistory() {
  return useQuery({
    queryKey: ["incursion-history"],
    queryFn: async (): Promise<IncursionHistory> => {
      const response = await fetch("/api/incursions/history");
      if (!response.ok) {
        throw new Error(`Incursion history: HTTP ${response.status}`);
      }
      return (await response.json()) as IncursionHistory;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Both sets of names; the page's (with stations and sizes) win. */
export const mergeLookups = (
  page: IncursionLookups,
  history: IncursionLookups | undefined,
): IncursionLookups =>
  history
    ? {
        constellations: { ...history.constellations, ...page.constellations },
        regions: { ...history.regions, ...page.regions },
        factions: { ...history.factions, ...page.factions },
        alliances: { ...history.alliances, ...page.alliances },
        solarSystems: { ...history.solarSystems, ...page.solarSystems },
      }
    : page;
