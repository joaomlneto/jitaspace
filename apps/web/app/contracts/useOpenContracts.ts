"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { useQueries } from "@tanstack/react-query";

import type {
  OpenContract,
  OpenContractsShard,
} from "~/components/Contracts/snapshot";
import {
  decodeOpenContractsShard,
  OPEN_CONTRACT_SHARDS,
} from "~/components/Contracts/snapshot";

interface DecodedShard {
  contracts: OpenContract[];
  snapshotAt: string | null;
  isBackfilling: boolean;
}

export interface OpenContracts {
  /** Every open public contract; empty until every shard has loaded. */
  contracts: OpenContract[];
  /** Shards loaded so far, of OPEN_CONTRACT_SHARDS. */
  loaded: number;
  isPending: boolean;
  isError: boolean;
  snapshotAt: string | null;
  isBackfilling: boolean;
}

async function fetchShard(
  shard: number,
  signal: AbortSignal,
): Promise<DecodedShard> {
  const response = await fetch(`/api/contracts/open/${shard}`, { signal });
  if (!response.ok) {
    throw new Error(
      `Open contracts shard ${shard} failed with HTTP ${response.status}`,
    );
  }
  const body = (await response.json()) as OpenContractsShard;
  return {
    contracts: decodeOpenContractsShard(body),
    snapshotAt: body.snapshotAt,
    isBackfilling: body.isBackfilling,
  };
}

const SHARDS = Array.from({ length: OPEN_CONTRACT_SHARDS }, (_, shard) => ({
  queryKey: ["open-contracts", shard] as const,
  queryFn: ({ signal }: { signal: AbortSignal }) => fetchShard(shard, signal),
  // The CDN holds each shard for the half hour between syncs.
  staleTime: 10 * 60 * 1000,
}));

/**
 * Module-level, so useQueries only combines again when a shard changes: the
 * page renders on every keystroke, and joining 50k contracts each time would
 * hand every memo downstream a new array.
 */
function combine(results: UseQueryResult<DecodedShard>[]): OpenContracts {
  const shards = results.flatMap((result) =>
    result.data === undefined ? [] : [result.data],
  );
  const complete = shards.length === results.length;
  return {
    contracts: complete ? shards.flatMap((shard) => shard.contracts) : [],
    loaded: shards.length,
    isPending: !complete && !results.some((result) => result.isError),
    isError: !complete && results.some((result) => result.isError),
    snapshotAt: shards.reduce<string | null>(
      (latest, shard) =>
        shard.snapshotAt !== null &&
        (latest === null || shard.snapshotAt > latest)
          ? shard.snapshotAt
          : latest,
      null,
    ),
    isBackfilling: shards.some((shard) => shard.isBackfilling),
  };
}

/** Every open public contract, loaded in shards and joined once all arrive. */
export function useOpenContracts(): OpenContracts {
  return useQueries({ queries: SHARDS, combine });
}
