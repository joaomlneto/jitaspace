import React, { memo } from "react";
import { Text, type TextProps } from "@mantine/core";

import { useCharacterAssets } from "@jitaspace/esi-client";

import { EveEntityName } from "./EveEntityName";

export type AssetLocationNameProps = TextProps & {
  locationId?: string | number;
};
export const AssetLocationName = memo(
  ({ locationId, ...otherProps }: AssetLocationNameProps) => {
    const { locations } = useCharacterAssets();

    const location = locationId ? locations[locationId] : undefined;

    /**
     * Logic from https://docs.esi.evetech.net/docs/asset_location_id.html
     */
    // Asset safety
    if (locationId === 2004) return <Text {...otherProps}>Asset Safety</Text>;

    if (!location) return <Text {...otherProps}>NO LOCATION</Text>;

    if (location.location_type === "item")
      return <Text {...otherProps}>ITEM LOCATION</Text>;

    if (location.location_type === "other")
      return <Text {...otherProps}>OTHER LOCATION</Text>;

    // station or solar system location: resolve it normally
    return (
      <EveEntityName
        entityId={locationId}
        category={location.location_type}
        {...otherProps}
      />
    );
  },
);
AssetLocationName.displayName = "AssetLocationName";
