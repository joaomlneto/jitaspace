"use client";

import type { BadgeProps } from "@mantine/core";
import { memo } from "react";
import { Badge, Skeleton } from "@mantine/core";

export type WarDefenderTickerBadgeProps = Omit<BadgeProps, "children"> & {
  ticker?: string;
};

export const WarDefenderTickerBadge = memo(
  ({ ticker, ...otherProps }: WarDefenderTickerBadgeProps) => {
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
WarDefenderTickerBadge.displayName = "WarDefenderTickerBadge";
