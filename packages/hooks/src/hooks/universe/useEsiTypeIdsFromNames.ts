"use client";

import { useEsiUniverseIdsFromNames } from "./useEsiUniverseIdsFromNames";

export const useEsiTypeIdsFromNames = (names: string[]) => {
  const result = useEsiUniverseIdsFromNames(names);
  return {
    loading: result.loading,
    error: result.error,
    data: result.data?.inventory_types ?? [],
  };
};
