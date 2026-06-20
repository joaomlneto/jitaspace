"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { useMarketGroup } from "@jitaspace/hooks";
import { MarketGroupName as UIMarketGroupName } from "@jitaspace/ui";

export type MarketGroupNameProps = TextProps & {
  marketGroupId?: number;
};

export const MarketGroupName = memo(
  ({ marketGroupId, ...otherProps }: MarketGroupNameProps) => {
    const marketGroup = useMarketGroup(marketGroupId ?? 0);
    return <UIMarketGroupName name={marketGroup.name} {...otherProps} />;
  },
);
MarketGroupName.displayName = "MarketGroupName";
