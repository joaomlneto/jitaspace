import { memo } from "react";
import { type CardProps } from "@mantine/core";

import { useGetCharactersCharacterIdFittings } from "@jitaspace/esi-client-kubb";
import { useEsiClientContext } from "@jitaspace/esi-hooks";

import { ShipFittingCard } from "./ShipFittingCard";

type EsiCharacterShipFittingCardProps = Omit<CardProps, "children"> & {
  fittingId: number;
  hideHeader?: boolean;
  hideModules?: boolean;
};

export const EsiCharacterShipFittingCard = memo(
  ({ fittingId, ...otherProps }: EsiCharacterShipFittingCardProps) => {
    const { characterId, isTokenValid, scopes, accessToken } =
      useEsiClientContext();
    const { data } = useGetCharactersCharacterIdFittings(
      characterId ?? 0,
      { token: accessToken },
      {},
      {
        query: {
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
