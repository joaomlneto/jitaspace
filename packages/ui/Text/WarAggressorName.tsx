import React, { memo } from "react";
import { type TextProps } from "@mantine/core";

import { useGetWarsWarId } from "@jitaspace/esi-client-kubb";

import { AllianceName } from "./AllianceName";
import { CorporationName } from "./CorporationName";
import { EveEntityName } from "./EveEntityName";


export type WarAggressorNameProps = TextProps & {
  warId?: number;
};

export const WarAggressorName = memo(
  ({ warId, ...otherProps }: WarAggressorNameProps) => {
    const { data } = useGetWarsWarId(
      warId ?? 0,
      {},
      {},
      { query: { enabled: warId !== undefined } },
    );

    if (data?.data.aggressor.alliance_id)
      return (
        <AllianceName
          allianceId={data.data.aggressor.alliance_id}
          {...otherProps}
        />
      );

    if (data?.data.aggressor.corporation_id)
      return (
        <CorporationName
          corporationId={data.data.aggressor.corporation_id}
          {...otherProps}
        />
      );

    return <EveEntityName {...otherProps} />;
  },
);
WarAggressorName.displayName = "WarAggressorName";
