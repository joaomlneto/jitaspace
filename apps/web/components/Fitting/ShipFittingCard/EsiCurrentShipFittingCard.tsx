import { memo } from "react";
import { type CardProps } from "@mantine/core";

import { useCharacterCurrentFit } from "@jitaspace/hooks";

import { ShipFittingCard } from "./ShipFittingCard";


type EsiCurrentShipFittingCardProps = Omit<CardProps, "children"> & {
  hideHeader?: boolean;
  hideModules?: boolean;
};

export const EsiCurrentShipFittingCard = memo(
  ({ ...otherProps }: EsiCurrentShipFittingCardProps) => {
    const fit = useCharacterCurrentFit();

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
