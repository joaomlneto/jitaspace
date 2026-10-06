"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Rows an entity page fetches from its own CDN-cached JSON route when a tab
 * that lists them opens, rather than carrying them in the page. A failed fetch
 * ends `isPending`, so the tab stops loading and can say so.
 */
export function useEntityTable<T>(url: string, enabled: boolean) {
  return useQuery({
    queryKey: ["entity-table", url],
    queryFn: async (): Promise<T> => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${url}: HTTP ${response.status}`);
      }
      return (await response.json()) as T;
    },
    enabled,
    staleTime: Infinity,
  });
}
