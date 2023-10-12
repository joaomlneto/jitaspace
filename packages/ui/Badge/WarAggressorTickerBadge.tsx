import React, { memo } from "react";
import { Badge, Skeleton, type BadgeProps } from "@mantine/core";

import { useGetWarsWarId } from "@jitaspace/esi-client-kubb";

import { AllianceTickerBadge } from "./AllianceTickerBadge";
import { CorporationTickerBadge } from "./CorporationTickerBadge";


type WarAggressorTickerBadgeProps = Omit<BadgeProps, "children"> & {
  warId?: number;
};

export const WarAggressorTickerBadge = memo(
  ({ warId, ...otherProps }: WarAggressorTickerBadgeProps) => {
    const { data } = useGetWarsWarId(
      warId ?? 0,
      {},
      {},
      { query: { enabled: warId !== undefined } },
    );

    if (data?.data.aggressor.alliance_id) {
      return (
        <AllianceTickerBadge
          allianceId={data.data.aggressor.alliance_id}
          {...otherProps}
        />
      );
    }

    if (data?.data.aggressor.corporation_id) {
      return (
        <CorporationTickerBadge
          corporationId={data.data.aggressor.corporation_id}
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
WarAggressorTickerBadge.displayName = "WarAggressorTickerBadge";
