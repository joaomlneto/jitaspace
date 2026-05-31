"use client";

import { memo } from "react";
import { type BadgeProps } from "@mantine/core";
import { useWar } from "@jitaspace/hooks";
import { AllianceTickerBadge } from "./AllianceTickerBadge";
import { CorporationTickerBadge } from "./CorporationTickerBadge";

export type WarDefenderTickerBadgeProps = Omit<BadgeProps, "children"> & {
  warId?: number;
};

export const WarDefenderTickerBadge = memo(({ warId, ...otherProps }: WarDefenderTickerBadgeProps) => {
  const { data: war } = useWar(warId ?? 0);
  const defenderAllianceId = war?.data.defender.alliance_id;
  const defenderCorporationId = war?.data.defender.corporation_id;

  if (defenderAllianceId) {
    return <AllianceTickerBadge allianceId={defenderAllianceId} {...otherProps} />;
  }
  return <CorporationTickerBadge corporationId={defenderCorporationId} {...otherProps} />;
});
WarDefenderTickerBadge.displayName = "WarDefenderTickerBadge";
