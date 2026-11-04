"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Notification type display names from the SDE, keyed by the `type` string ESI
 * returns. Undefined until loaded, or if the fetch fails, which titles fall back
 * from (see `notificationTitle`).
 */
export function useNotificationTypeNames() {
  return useQuery({
    queryKey: ["notification-type-names"],
    queryFn: async (): Promise<Record<string, string>> => {
      const response = await fetch("/api/notification-types");
      if (!response.ok) {
        throw new Error(`/api/notification-types: HTTP ${response.status}`);
      }
      return (await response.json()) as Record<string, string>;
    },
    staleTime: Infinity,
  }).data;
}
