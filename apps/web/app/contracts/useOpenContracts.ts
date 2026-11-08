"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  OpenContract,
  OpenContractsSnapshot,
} from "~/components/Contracts/snapshot";
import { decodeOpenContracts } from "~/components/Contracts/snapshot";

export interface OpenContracts {
  /** Every open public contract; empty until they have loaded. */
  contracts: OpenContract[];
  isPending: boolean;
  isError: boolean;
  snapshotAt: string | null;
  isBackfilling: boolean;
}

interface DecodedSnapshot {
  contracts: OpenContract[];
  snapshotAt: string | null;
  isBackfilling: boolean;
}

async function fetchOpenContracts(
  signal: AbortSignal,
): Promise<DecodedSnapshot> {
  // Sent gzipped; the browser inflates it before `json()` reads it.
  const response = await fetch("/api/contracts/open", { signal });
  if (!response.ok) {
    throw new Error(`Open contracts failed with HTTP ${response.status}`);
  }
  const snapshot = (await response.json()) as OpenContractsSnapshot;
  return {
    contracts: decodeOpenContracts(snapshot),
    snapshotAt: snapshot.snapshotAt,
    isBackfilling: snapshot.isBackfilling,
  };
}

const NONE: OpenContract[] = [];

/** Every open public contract, as one consistent snapshot. */
export function useOpenContracts(): OpenContracts {
  const { data, isPending, isError } = useQuery({
    queryKey: ["open-contracts"],
    queryFn: ({ signal }) => fetchOpenContracts(signal),
    // The CDN holds the snapshot for the half hour between syncs.
    staleTime: 10 * 60 * 1000,
  });
  return {
    // A stable empty list, so memos downstream do not rerun while loading.
    contracts: data?.contracts ?? NONE,
    isPending: isPending && !isError,
    isError,
    snapshotAt: data?.snapshotAt ?? null,
    isBackfilling: data?.isBackfilling ?? false,
  };
}
