import { memo } from "react";
import { type CardProps } from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdFittings,
} from "@jitaspace/esi-client";

import { ShipFittingCard } from "~/components/fitting";

type EsiCharacterShipFittingCardProps = Omit<CardProps, "children"> & {
  fittingId: number;
  hideHeader?: boolean;
  hideModules?: boolean;
};

export const EsiCharacterShipFittingCard = memo(
  ({ fittingId, ...otherProps }: EsiCharacterShipFittingCardProps) => {
    const { characterId, isTokenValid, scopes } = useEsiClientContext();
    const { data } = useGetCharactersCharacterIdFittings(
      characterId ?? 0,
      {},
      {
        swr: {
          enabled:
            isTokenValid &&
            !!characterId &&
            scopes.includes("esi-fittings.read_fittings.v1"),
        },
      },
    );

    const fit = data?.data.find((f) => f.fitting_id === fittingId);

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