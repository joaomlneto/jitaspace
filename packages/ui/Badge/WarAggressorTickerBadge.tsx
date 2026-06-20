"use client";

import type { BadgeProps } from "@mantine/core";
import { memo } from "react";
import { Badge, Skeleton } from "@mantine/core";

export type WarAggressorTickerBadgeProps = Omit<BadgeProps, "children"> & {
  ticker?: string;
};

export const WarAggressorTickerBadge = memo(
  ({ ticker, ...otherProps }: WarAggressorTickerBadgeProps) => {
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
WarAggressorTickerBadge.displayName = "WarAggressorTickerBadge";
