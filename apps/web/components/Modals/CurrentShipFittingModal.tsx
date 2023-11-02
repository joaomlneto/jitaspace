import React from "react";
import { type ContextModalProps } from "@mantine/modals";

import { useCharacterCurrentFit } from "@jitaspace/hooks";

import { ShipFittingCard } from "~/components/Fitting";


export function CurrentShipFittingModal({ innerProps }: ContextModalProps<{}>) {
  const fit = useCharacterCurrentFit();
  return (
    <ShipFittingCard
      name={fit.name}
      shipTypeId={fit.shipTypeId}
      description="Current Ship"
      items={(fit?.items ?? []).map((item) => ({
        typeId: item.type_id,
        flag: item.location_flag,
        quantity: item.quantity,
      }))}
    />
  );
}
