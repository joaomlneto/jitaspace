"use client";

import type { BadgeProps } from "@mantine/core";
import { memo } from "react";
import { Badge, Skeleton } from "@mantine/core";

export type CorporationTickerBadgeProps = Omit<BadgeProps, "children"> & {
  ticker?: string;
};

export const CorporationTickerBadge = memo(
  ({ ticker, ...otherProps }: CorporationTickerBadgeProps) => {
    if (!ticker) {
      return (
        <Skeleton>
          <Badge {...otherProps}>XXXXX</Badge>
        </Skeleton>
      );
    }

    return <Badge {...otherProps}>{ticker}</Badge>;
  },
);
CorporationTickerBadge.displayName = "CorporationTickerBadge";
