"use client";

import { useQuery } from "@tanstack/react-query";

import type { CompareCatalog } from "./catalog";
import { COMPARE_CATALOG_URL, indexCompareCatalog } from "./catalog";

async function fetchCompareCatalog(): Promise<CompareCatalog> {
  const response = await fetch(COMPARE_CATALOG_URL);
  if (!response.ok) {
    throw new Error(`Compare catalog request failed: ${response.status}`);
  }
  return (await response.json()) as CompareCatalog;
}

/**
 * The compare tool's catalog, indexed for lookup. It changes only when a new
 * SDE build is ingested, so one fetch lasts the whole visit.
 */
export function useCompareCatalog() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["compare-catalog"],
    queryFn: fetchCompareCatalog,
    select: indexCompareCatalog,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  return { catalog: data, isLoading, isError, refetch };
}
