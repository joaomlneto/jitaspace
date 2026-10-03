"use client";

import { useMemo } from "react";

import { useFuzzworkRegionalMarketAggregates } from "@jitaspace/hooks";

import type { AugmentedOffer } from "./pricing";

interface UseAugmentedOffersArgs {
  corporations: { corporationId: number; name: string }[];
  types: { typeId: number; name: string }[];
  offers: {
    offerId: number;
    corporationId: number;
    typeId: number;
    quantity: number;
    akCost: number | null;
    lpCost: number;
    iskCost: number;
    requiredItems: {
      typeId: number;
      quantity: number;
    }[];
  }[];
}

/** Jita's region (The Forge) — where market prices are sampled. */
const THE_FORGE_REGION_ID = 10000002;

/**
 * The LP store table's rows: builds id→name lookups from the server-resolved
 * props, fetches Jita market aggregates for every type, and augments each
 * offer — and each of its required items — with the resolved name and market
 * stats.
 */
export function useAugmentedOffers({
  corporations,
  types,
  offers,
}: UseAugmentedOffersArgs): AugmentedOffer[] {
  const typeIds = useMemo(() => types.map((type) => type.typeId), [types]);

  const marketStats = useFuzzworkRegionalMarketAggregates(
    typeIds,
    THE_FORGE_REGION_ID,
  );

  const typeNames = useMemo(() => {
    const map: Record<number, string> = {};
    types.forEach((type) => (map[type.typeId] = type.name));
    return map;
  }, [types]);

  const corporationNames = useMemo(() => {
    const map: Record<number, string> = {};
    corporations.forEach(
      (corporation) => (map[corporation.corporationId] = corporation.name),
    );
    return map;
  }, [corporations]);

  const augmentedOffers = useMemo<AugmentedOffer[]>(
    () =>
      offers.map((offer) => ({
        ...offer,
        requiredItems: offer.requiredItems.map((item) => ({
          ...item,
          typeName: typeNames[item.typeId],
          marketStats: marketStats.data?.[item.typeId],
        })),
        typeName: typeNames[offer.typeId],
        corporationName: corporationNames[offer.corporationId],
        marketStats: marketStats.data?.[offer.typeId],
      })),
    [offers, typeNames, corporationNames, marketStats.data],
  );

  return augmentedOffers;
}
