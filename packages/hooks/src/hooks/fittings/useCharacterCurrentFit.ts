import { useMemo } from "react";

import { GetCharactersCharacterIdFittingsQueryResponseItemsFlag } from "@jitaspace/esi-client";

import { useCharacterAssets } from "../assets";
import { useCharacterCurrentShip } from "../location";


export type FittingItemFlag =
  GetCharactersCharacterIdFittingsQueryResponseItemsFlag;

export const useCharacterCurrentFit = (characterId: number) => {
  const { data: ship } = useCharacterCurrentShip(characterId);
  const { assets } = useCharacterAssets(characterId);

  const modules = useMemo(() => {
    if (!ship) return null;
    return Object.values(assets).filter(
      (asset) => asset.location_id === ship?.data.ship_item_id,
    );
  }, [ship, assets]);

  return {
    name: ship?.data.ship_name,
    shipTypeId: ship?.data.ship_type_id,
    items: modules?.map((module) => ({
      ...module,
      location_flag: module.location_flag as FittingItemFlag,
    })),
  };
};
