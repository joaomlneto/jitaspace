"use client";

import { useMemo } from "react";

import { useAuthenticatedContracts } from "./useAuthenticatedContracts";
import { useContractItemsAndBids } from "./useContractItemsAndBids";

/**
 * One contract, if any authenticated character or corporation can see it,
 * with its items and (for auctions) its bids.
 *
 * ESI has no "get contract by id": a contract is only reachable through the
 * listing of a subject that can see it. So this reads every listing
 * (`useAuthenticatedContracts`, which the contracts page shares), picks the
 * contract out, and reads its items and bids through the first listing it came
 * from.
 */
export function useAuthenticatedContract(contractId: number | undefined) {
  const contracts = useAuthenticatedContracts();

  const contract = useMemo(
    () =>
      contractId === undefined
        ? undefined
        : contracts.data.find((entry) => entry.contract_id === contractId),
    [contracts.data, contractId],
  );

  const source = contract?.sources[0];
  const details = useContractItemsAndBids(contract?.contract_id, source, {
    isAuction: contract?.type === "auction",
  });

  return {
    contract,
    source,
    items: details.items,
    bids: details.bids,
    /** True while the listings are loading; the contract may still turn up. */
    isPending: contracts.isPending,
    isLoadingDetails: details.isLoading,
    error: details.error,
  };
}
