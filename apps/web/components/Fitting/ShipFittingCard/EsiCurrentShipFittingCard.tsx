import type { CardProps } from "@mantine/core";
import type React from "react";
import { memo } from "react";
import { Text } from "@mantine/core";

import { useCharacterCurrentFit } from "@jitaspace/hooks";

import { ShipFittingCard } from "./ShipFittingCard";

type EsiCurrentShipFittingCardProps = Omit<CardProps, "children"> & {
  characterId: number;
  hideHeader?: boolean;
  hideModules?: boolean;
  fallback?: React.ReactNode;
  hideFallback?: boolean;
};

export const EsiCurrentShipFittingCard = memo(
  ({
    characterId,
    fallback,
    hideFallback = false,
    hideModules = false,
    ...otherProps
  }: EsiCurrentShipFittingCardProps) => {
    // A card that hides the modules never renders them, so there is no reason
    // to walk the character's whole asset collection to find them.
    const { hasToken, isLoading, ...fit } = useCharacterCurrentFit(
      characterId,
      {
        includeModules: !hideModules,
      },
    );

    if (!hasToken) {
      return hideFallback
        ? null
        : (fallback ?? (
            <Text size="xs" c="dimmed">
              Active Ship Fitting not available
            </Text>
          ));
    }

    return (
      <ShipFittingCard
        name={fit.name}
        description="Current Ship"
        shipTypeId={fit.shipTypeId}
        hideModules={hideModules}
        isLoading={isLoading}
        items={(fit.items ?? []).map((item) => ({
          typeId: item.type_id,
          flag: item.location_flag,
          quantity: item.quantity,
        }))}
        {...otherProps}
      />
    );
  },
);
EsiCurrentShipFittingCard.displayName = "EsiCurrentShipFittingCard";
