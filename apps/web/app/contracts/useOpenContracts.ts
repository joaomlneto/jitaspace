"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  OpenContract,
  OpenContractsSnapshot,
} from "~/components/Contracts/snapshot";
import {
  decodeOpenContracts,
  inflateJson,
} from "~/components/Contracts/snapshot";

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
  const response = await fetch("/api/contracts/open", { signal });
  if (!response.ok) {
    throw new Error(`Open contracts failed with HTTP ${response.status}`);
  }
  // A gzip file, not a gzip-encoded response: inflated here, not by the browser.
  const snapshot = (await inflateJson(
    await response.arrayBuffer(),
  )) as OpenContractsSnapshot;
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
