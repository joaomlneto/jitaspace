"use client";

import { useMemo } from "react";

import type { ItemsFlagEnum } from "@jitaspace/esi-client";

import { useCharacterAssets } from "../assets";
import { useAccessToken } from "../auth";
import { useCharacterCurrentShip } from "../location";

export type FittingItemFlag = ItemsFlagEnum;

export interface UseCharacterCurrentFitOptions {
  /**
   * Whether to resolve the fitted modules.
   *
   * Modules are not their own ESI resource — they are the character's assets
   * that sit inside the active ship — so producing them costs a full
   * multi-page walk of `/characters/{id}/assets/`. A caller rendering only the
   * ship header (the collapsed cards on the landing page and the fittings page
   * both pass `hideModules`) should pass `false` rather than pay for a result
   * it discards. Defaults to `true`.
   */
  includeModules?: boolean;
}

export const useCharacterCurrentFit = (
  characterId: number,
  { includeModules = true }: UseCharacterCurrentFitOptions = {},
) => {
  const shipQuery = useCharacterCurrentShip(characterId);

  // Read the assets token for THIS character separately from the query, so
  // `hasToken` means the same thing whether or not the modules are fetched.
  // useCharacterAssets(undefined) would resolve whichever logged-in character
  // happens to hold the scope, which is not necessarily this one.
  const { accessToken: assetsAccessToken } = useAccessToken({
    characterId,
    scopes: ["esi-assets.read_assets.v1"],
  });

  // Passing `undefined` leaves the query disabled, so the asset walk never
  // starts. The hook itself is still called unconditionally.
  const assetsQuery = useCharacterAssets(
    includeModules ? characterId : undefined,
  );

  const ship = shipQuery.data;
  const assets = assetsQuery.assets;

  const items = useMemo(() => {
    if (!includeModules || !ship) return undefined;
    return Object.values(assets)
      .filter((asset) => asset.location_id === ship.data.ship_item_id)
      .map((module) => ({
        ...module,
        location_flag: module.location_flag as FittingItemFlag,
      }));
  }, [includeModules, ship, assets]);

  return {
    hasToken: shipQuery.hasToken && assetsAccessToken !== null,
    /**
     * True while either query this fit is assembled from is still resolving.
     * Without it an empty `items` is indistinguishable from a fitting whose
     * asset pages are still streaming in, and the caller has nothing to key a
     * skeleton off.
     *
     * `hasNextPage` is part of it because the assets query settles as soon as
     * its FIRST page lands — the remaining pages are walked eagerly afterwards
     * and report through `isFetchingNextPage`. Modules are filtered out of the
     * whole collection, so a fit assembled from page one alone is missing
     * whatever sits on the pages still in flight. An errored walk stops
     * counting, otherwise a failed page would pin this true forever.
     */
    isLoading:
      shipQuery.isLoading ||
      (includeModules &&
        (assetsQuery.isLoading ||
          (assetsQuery.hasNextPage && !assetsQuery.error))),
    /** The first failure of the two queries, or `null` if both are healthy. */
    error: shipQuery.error ?? (includeModules ? assetsQuery.error : null),
    name: ship?.data.ship_name,
    shipTypeId: ship?.data.ship_type_id,
    items,
  };
};
