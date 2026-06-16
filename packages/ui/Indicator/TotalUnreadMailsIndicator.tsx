"use client";

import type { IndicatorProps } from "@mantine/core";
import { memo } from "react";
import { Indicator } from "@mantine/core";

export type TotalUnreadMailsIndicatorProps = IndicatorProps & {
  totalUnreadCount?: number;
};

export const TotalUnreadMailsIndicator = memo(
  ({ totalUnreadCount, ...otherProps }: TotalUnreadMailsIndicatorProps) => {
    return (
      <Indicator
        disabled={totalUnreadCount === undefined || totalUnreadCount === 0}
        label={`${totalUnreadCount ?? ""}`}
        {...otherProps}
      />
    );
  },
);
TotalUnreadMailsIndicator.displayName = "TotalUnreadMailsIndicator";
