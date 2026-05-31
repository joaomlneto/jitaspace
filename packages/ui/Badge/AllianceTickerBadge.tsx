"use client";

import type { BadgeProps } from "@mantine/core";
import { memo } from "react";
import { Badge, Skeleton } from "@mantine/core";

export type AllianceTickerBadgeProps = Omit<BadgeProps, "children"> & {
  ticker?: string;
};

export const AllianceTickerBadge = memo(
  ({ ticker, ...otherProps }: AllianceTickerBadgeProps) => {
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
AllianceTickerBadge.displayName = "AllianceTickerBadge";
