"use client";

import type { BadgeProps } from "@mantine/core";
import { memo } from "react";

import { useWar } from "@jitaspace/hooks";

import { AllianceTickerBadge } from "./AllianceTickerBadge";
import { CorporationTickerBadge } from "./CorporationTickerBadge";

export type WarAggressorTickerBadgeProps = Omit<BadgeProps, "children"> & {
  warId?: number;
};

export const WarAggressorTickerBadge = memo(
  ({ warId, ...otherProps }: WarAggressorTickerBadgeProps) => {
    const { data: war } = useWar(warId ?? 0);
    const aggressorAllianceId = war?.data.aggressor.alliance_id;
    const aggressorCorporationId = war?.data.aggressor.corporation_id;

    if (aggressorAllianceId) {
      return (
        <AllianceTickerBadge allianceId={aggressorAllianceId} {...otherProps} />
      );
    }
    return (
      <CorporationTickerBadge
        corporationId={aggressorCorporationId}
        {...otherProps}
      />
    );
  },
);
WarAggressorTickerBadge.displayName = "WarAggressorTickerBadge";
