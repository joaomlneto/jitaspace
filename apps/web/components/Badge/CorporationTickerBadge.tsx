"use client";

import type { BadgeProps } from "@mantine/core";
import { memo } from "react";

import { useCorporation } from "@jitaspace/hooks";
import { CorporationTickerBadge as UICorporationTickerBadge } from "@jitaspace/ui";

export type CorporationTickerBadgeProps = Omit<BadgeProps, "children"> & {
  corporationId?: number;
};

export const CorporationTickerBadge = memo(
  ({ corporationId, ...otherProps }: CorporationTickerBadgeProps) => {
    const { data } = useCorporation(corporationId ?? 0);
    return (
      <UICorporationTickerBadge ticker={data?.data.ticker} {...otherProps} />
    );
  },
);
CorporationTickerBadge.displayName = "CorporationTickerBadge";
