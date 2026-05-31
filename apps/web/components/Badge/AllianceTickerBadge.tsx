"use client";

import { memo } from "react";
import { type BadgeProps } from "@mantine/core";
import { useEsiAllianceInformation } from "@jitaspace/hooks";
import { AllianceTickerBadge as UIAllianceTickerBadge } from "@jitaspace/ui";

export type AllianceTickerBadgeProps = Omit<BadgeProps, "children"> & {
  allianceId?: number;
};

export const AllianceTickerBadge = memo(({ allianceId, ...otherProps }: AllianceTickerBadgeProps) => {
  const { data } = useEsiAllianceInformation(allianceId ?? 0);
  return <UIAllianceTickerBadge ticker={data?.data.ticker} {...otherProps} />;
});
AllianceTickerBadge.displayName = "AllianceTickerBadge";
