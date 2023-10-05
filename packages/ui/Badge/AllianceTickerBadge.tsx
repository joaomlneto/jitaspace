import { memo } from "react";
import { Badge, Skeleton, type BadgeProps } from "@mantine/core";

import { useGetAlliancesAllianceId } from "@jitaspace/esi-client-kubb";

type AllianceTickerBadgeProps = Omit<BadgeProps, "children"> & {
  allianceId?: number | string;
};

export const AllianceTickerBadge = memo(
  ({ allianceId, ...otherProps }: AllianceTickerBadgeProps) => {
    const { data } = useGetAlliancesAllianceId(
      typeof allianceId === "number" ? allianceId : Number(allianceId) ?? 0,
      {},
      { swr: { enabled: allianceId !== undefined } },
    );

    if (!data) {
      return (
        <Skeleton>
          <Badge {...otherProps}>XXXXX</Badge>
        </Skeleton>
      );
    }

    return <Badge {...otherProps}>{data.data.ticker}</Badge>;
  },
);
AllianceTickerBadge.displayName = "AllianceTickerBadge";
