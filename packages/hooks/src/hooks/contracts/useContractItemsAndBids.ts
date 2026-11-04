"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getCharactersCharacterIdContractsContractIdBidsQueryOptions,
  getCharactersCharacterIdContractsContractIdItemsQueryOptions,
  getCorporationsCorporationIdContractsContractIdBidsQueryOptions,
  getCorporationsCorporationIdContractsContractIdItemsQueryOptions,
} from "@jitaspace/esi-client";

import type { ContractSource } from "./useAuthenticatedContracts";
import { useEsiSubjects } from "../auth";

/** One line of a contract's items, as either listing reports it. */
export interface EsiContractItem {
  record_id: number;
  type_id: number;
  quantity: number;
  /** True for items the issuer offers, false for items they ask for. */
  is_included: boolean;
  is_singleton: boolean;
  /** -1 for an original blueprint, -2 for a copy. */
  raw_quantity?: number;
}

export interface EsiContractBid {
  bid_id: number;
  bidder_id: number;
  amount: number;
  date_bid: string;
}

const CHARACTER_SCOPES = ["esi-contracts.read_character_contracts.v1"] as const;
const CORPORATION_SCOPES = [
  "esi-contracts.read_corporation_contracts.v1",
] as const;

// Module-level so their identity is stable and React Query memoises the select.
const selectItems = (response: { data: unknown }) =>
  response.data as EsiContractItem[];
const selectBids = (response: { data: unknown }) =>
  response.data as EsiContractBid[];

/**
 * The items and bids of a contract the authenticated characters can see,
 * read through the listing it came from.
 *
 * ESI answers `/contracts/{id}/items` and `/bids` only under the character or
 * corporation that can see the contract, so the caller names that `source`
 * (`useAuthenticatedContracts` reports it per contract). Bids are fetched only
 * for auctions — the other types never have any.
 *
 * @param contractId - undefined holds both requests.
 */
export function useContractItemsAndBids(
  contractId: number | undefined,
  source: ContractSource | undefined,
  { isAuction = false }: { isAuction?: boolean } = {},
) {
  const characters = useEsiSubjects({
    kind: "character",
    scopes: [...CHARACTER_SCOPES],
  });
  const corporations = useEsiSubjects({
    kind: "corporation",
    scopes: [...CORPORATION_SCOPES],
  });

  const subjects = source?.kind === "corporation" ? corporations : characters;
  const subject = subjects.find(({ id }) => id === source?.subjectId);
  const enabled = contractId !== undefined && subject !== undefined;
  const subjectId = subject?.id ?? 0;
  const headers = subject?.authHeaders;

  // One query per endpoint rather than a ternary over the options: each keeps
  // its own generated key, so it shares the cache entry with the
  // single-subject hook for the same contract.
  const isCorporation = source?.kind === "corporation";

  const characterItems = useQuery({
    ...getCharactersCharacterIdContractsContractIdItemsQueryOptions(
      subjectId,
      contractId,
      headers,
    ),
    enabled: enabled && !isCorporation,
    select: selectItems,
  });
  const corporationItems = useQuery({
    ...getCorporationsCorporationIdContractsContractIdItemsQueryOptions(
      contractId,
      subjectId,
      headers,
    ),
    enabled: enabled && isCorporation,
    select: selectItems,
  });
  const characterBids = useQuery({
    ...getCharactersCharacterIdContractsContractIdBidsQueryOptions(
      subjectId,
      contractId,
      headers,
    ),
    enabled: enabled && isAuction && !isCorporation,
    select: selectBids,
  });
  const corporationBids = useQuery({
    ...getCorporationsCorporationIdContractsContractIdBidsQueryOptions(
      contractId,
      subjectId,
      undefined,
      headers,
    ),
    enabled: enabled && isAuction && isCorporation,
    select: selectBids,
  });

  const items = isCorporation ? corporationItems : characterItems;
  const bids = isCorporation ? corporationBids : characterBids;

  return {
    /** False when no authenticated character can read this source. */
    canRead: subject !== undefined,
    items: items.data,
    bids: bids.data,
    isLoading: items.isLoading || bids.isLoading,
    error: items.error ?? bids.error,
  };
}
