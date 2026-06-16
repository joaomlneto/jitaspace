"use client";

import { memo } from "react";
import { type TextProps } from "@mantine/core";

import { WarAggressorName as UIWarAggressorName } from "@jitaspace/eve-components";
import { useWar } from "@jitaspace/hooks";

export type WarAggressorNameProps = TextProps & {
  warId?: number;
};

export const WarAggressorName = memo(
  ({ warId, ...otherProps }: WarAggressorNameProps) => {
    const { data: war } = useWar(warId ?? 0);
    return (
      <UIWarAggressorName
        aggressorAllianceId={war?.data.aggressor.alliance_id}
        aggressorCorporationId={war?.data.aggressor.corporation_id}
        {...otherProps}
      />
    );
  },
);
WarAggressorName.displayName = "WarAggressorName";
