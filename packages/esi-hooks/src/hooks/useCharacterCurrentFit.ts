import { useMemo } from "react";

import { GetCharactersCharacterIdFittingsQueryResponseItemsFlag } from "@jitaspace/esi-client";

import { useCharacterAssets } from "./useCharacterAssets";
import { useCharacterCurrentShip } from "./useCharacterCurrentShip";
import { useEsiClientContext } from "./useEsiClientContext";


export const useCharacterCurrentFit = () => {
  const { characterId, isTokenValid, scopes, accessToken } =
    useEsiClientContext();

  const { data: ship } = useCharacterCurrentShip();

  const { assets } = useCharacterAssets();

  const modules = useMemo(() => {
    if (!ship) return null;
    return Object.values(assets).filter(
      (asset) => asset.location_id === ship?.data.ship_item_id,
    );
  }, [ship, assets]);

  //const shipName

  return {
    name: ship?.data.ship_name,
    shipTypeId: ship?.data.ship_type_id,
    items: modules?.map((module) => ({
      ...module,
      location_flag:
        module.location_flag as GetCharactersCharacterIdFittingsQueryResponseItemsFlag,
    })),
  };
};
