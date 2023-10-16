import React, { memo } from "react";
import { Badge, Skeleton, type BadgeProps } from "@mantine/core";

import { useGetWarsWarId } from "@jitaspace/esi-client";

import { AllianceTickerBadge } from "./AllianceTickerBadge";
import { CorporationTickerBadge } from "./CorporationTickerBadge";

type WarDefenderTickerBadgeProps = Omit<BadgeProps, "children"> & {
  warId?: number;
};

export const WarDefenderTickerBadge = memo(
  ({ warId, ...otherProps }: WarDefenderTickerBadgeProps) => {
    const { data } = useGetWarsWarId(
      warId ?? 0,
      {},
      {},
      { query: { enabled: warId !== undefined } },
    );

    if (data?.data.defender.alliance_id) {
      return (
        <AllianceTickerBadge
          allianceId={data.data.defender.alliance_id}
          {...otherProps}
        />
      );
    }

    if (data?.data.defender.corporation_id) {
      return (
        <CorporationTickerBadge
          corporationId={data.data.defender.corporation_id}
          {...otherProps}
        />
      );
    }

    return (
      <Skeleton>
        <Badge {...otherProps}>XXXXX</Badge>
      </Skeleton>
    );
  },
);
WarDefenderTickerBadge.displayName = "WarDefenderTickerBadge";
