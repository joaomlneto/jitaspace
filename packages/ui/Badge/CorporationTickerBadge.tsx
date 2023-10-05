import { memo } from "react";
import { Badge, Skeleton, type BadgeProps } from "@mantine/core";

import { useGetCorporationsCorporationId } from "@jitaspace/esi-client-kubb";

type CorporationTickerBadgeProps = Omit<BadgeProps, "children"> & {
  corporationId?: number | string;
};

export const CorporationTickerBadge = memo(
  ({ corporationId, ...otherProps }: CorporationTickerBadgeProps) => {
    const { data } = useGetCorporationsCorporationId(
      typeof corporationId === "number"
        ? corporationId
        : Number(corporationId) ?? 0,
      {},
      { swr: { enabled: corporationId !== undefined } },
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
CorporationTickerBadge.displayName = "CorporationTickerBadge";
