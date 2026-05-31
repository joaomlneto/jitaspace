"use client";

import React, { memo } from "react";
import { type TextProps } from "@mantine/core";

import { AllianceName } from "./AllianceName";
import { CorporationName } from "./CorporationName";
import { EveEntityName } from "./EveEntityName";

export type WarAggressorNameProps = TextProps & {
  aggressorAllianceId?: number;
  aggressorCorporationId?: number;
};

export const WarAggressorName = memo(
  ({
    aggressorAllianceId,
    aggressorCorporationId,
    ...otherProps
  }: WarAggressorNameProps) => {
    if (aggressorAllianceId)
      return (
        <AllianceName allianceId={aggressorAllianceId} {...otherProps} />
      );

    if (aggressorCorporationId)
      return (
        <CorporationName
          corporationId={aggressorCorporationId}
          {...otherProps}
        />
      );

    return <EveEntityName {...otherProps} />;
  },
);
WarAggressorName.displayName = "WarAggressorName";
