import { memo } from "react";
import { type CardProps } from "@mantine/core";

import { useCharacterFitting } from "@jitaspace/hooks";

import { ShipFittingCard } from "./ShipFittingCard";


type EsiCharacterShipFittingCardProps = Omit<CardProps, "children"> & {
  characterId: number;
  fittingId: number;
  hideHeader?: boolean;
  hideModules?: boolean;
};

export const EsiCharacterShipFittingCard = memo(
  ({
    characterId,
    fittingId,
    ...otherProps
  }: EsiCharacterShipFittingCardProps) => {
    const { data: fit } = useCharacterFitting(characterId, fittingId);

    return (
      <ShipFittingCard
        name={fit?.name}
        description={fit?.description}
        fittingId={fit?.fitting_id}
        shipTypeId={fit?.ship_type_id}
        items={(fit?.items ?? []).map((item) => ({
          typeId: item.type_id,
          flag: item.flag,
          quantity: item.quantity,
        }))}
        {...otherProps}
      />
    );
  },
);
EsiCharacterShipFittingCard.displayName = "EsiCharacterShipFittingCard";
