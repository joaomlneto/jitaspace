"use client";

import React, { memo } from "react";
import { type TextProps } from "@mantine/core";

import { AllianceName } from "./AllianceName";
import { CorporationName } from "./CorporationName";
import { EveEntityName } from "./EveEntityName";

export type WarDefenderNameProps = TextProps & {
  defenderAllianceId?: number;
  defenderCorporationId?: number;
};

export const WarDefenderName = memo(
  ({
    defenderAllianceId,
    defenderCorporationId,
    ...otherProps
  }: WarDefenderNameProps) => {
    if (defenderAllianceId)
      return (
        <AllianceName allianceId={defenderAllianceId} {...otherProps} />
      );

    if (defenderCorporationId)
      return (
        <CorporationName
          corporationId={defenderCorporationId}
          {...otherProps}
        />
      );

    return <EveEntityName {...otherProps} />;
  },
);
WarDefenderName.displayName = "WarDefenderName";
