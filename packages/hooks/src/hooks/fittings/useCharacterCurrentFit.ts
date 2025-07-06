"use client";

import { useMemo } from "react";

import { ItemsFlagEnum } from "@jitaspace/esi-client";

import { useCharacterAssets } from "../assets";
import { useCharacterCurrentShip } from "../location";

export type FittingItemFlag = ItemsFlagEnum;

export const useCharacterCurrentFit = (characterId: number) => {
  const { data: ship, hasToken: hasShipToken } =
    useCharacterCurrentShip(characterId);
  const { assets, hasToken: hasAssetsToken } = useCharacterAssets(characterId);

  const modules = useMemo(() => {
    if (!ship) return null;
    return Object.values(assets).filter(
      (asset) => asset.location_id === ship?.data.ship_item_id,
    );
  }, [ship, assets]);

  return {
    hasToken: hasShipToken && hasAssetsToken,
    name: ship?.data.ship_name,
    shipTypeId: ship?.data.ship_type_id,
    items: modules?.map((module) => ({
      ...module,
      location_flag: module.location_flag as FittingItemFlag,
    })),
  };
};
