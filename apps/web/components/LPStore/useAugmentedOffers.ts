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

interface UseAugmentedOffersResult {
  sortedCorporations: { corporationId: number; name: string }[];
  sortedTypes: { typeId: number; name: string }[];
  augmentedOffers: AugmentedOffer[];
}

/** Jita's region (The Forge) — where market prices are sampled. */
const THE_FORGE_REGION_ID = 10000002;

/**
 * Shared data preparation for both LP store table engines (the classic
 * mantine-react-table and the experimental engine-agnostic DataTable).
 *
 * It sorts the corporation/type option lists, builds id→name lookups from the
 * server-resolved props, fetches Jita market aggregates for every type, and
 * augments each offer — and each of its required items — with the resolved name
 * and market stats. Centralising it here keeps the two engine components from
 * duplicating this logic.
 */
export function useAugmentedOffers({
  corporations,
  types,
  offers,
}: UseAugmentedOffersArgs): UseAugmentedOffersResult {
  const sortedCorporations = useMemo(
    () => [...corporations].sort((a, b) => a.name.localeCompare(b.name)),
    [corporations],
  );

  const sortedTypes = useMemo(
    () => [...types].sort((a, b) => a.name.localeCompare(b.name)),
    [types],
  );

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

  return { sortedCorporations, sortedTypes, augmentedOffers };
}
