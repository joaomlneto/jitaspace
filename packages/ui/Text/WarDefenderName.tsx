import React, { memo } from "react";
import { type TextProps } from "@mantine/core";

import { useGetWarsWarId } from "@jitaspace/esi-client-kubb";

import { AllianceName } from "./AllianceName";
import { CorporationName } from "./CorporationName";
import { EveEntityName } from "./EveEntityName";


export type WarDefenderNameProps = TextProps & {
  warId?: number;
};

export const WarDefenderName = memo(
  ({ warId, ...otherProps }: WarDefenderNameProps) => {
    const { data } = useGetWarsWarId(
      warId ?? 0,
      {},
      {},
      { query: { enabled: warId !== undefined } },
    );

    if (data?.data.defender.alliance_id)
      return (
        <AllianceName
          allianceId={data.data.defender.alliance_id}
          {...otherProps}
        />
      );

    if (data?.data.defender.corporation_id)
      return (
        <CorporationName
          corporationId={data.data.defender.corporation_id}
          {...otherProps}
        />
      );

    return <EveEntityName {...otherProps} />;
  },
);
WarDefenderName.displayName = "WarDefenderName";
