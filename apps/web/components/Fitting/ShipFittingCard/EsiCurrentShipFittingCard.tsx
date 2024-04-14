import React, { memo } from "react";
import { Text, type CardProps } from "@mantine/core";

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
    ...otherProps
  }: EsiCurrentShipFittingCardProps) => {
    const { hasToken, ...fit } = useCharacterCurrentFit(characterId);

    if (!hasToken) {
      return hideFallback
        ? null
        : fallback ?? (
            <Text size="xs" c="dimmed">
              Active Ship Fitting not available
            </Text>
          );
    }

    return (
      <ShipFittingCard
        name={fit?.name}
        description="Current Ship"
        shipTypeId={fit?.shipTypeId}
        items={(fit?.items ?? []).map((item) => ({
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
