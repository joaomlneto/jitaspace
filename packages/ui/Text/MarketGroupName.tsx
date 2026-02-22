"use client";

import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetMarketsGroupsMarketGroupId } from "@jitaspace/esi-client";





export type MarketGroupNameProps = TextProps & {
  marketGroupId?: number;
};

export const MarketGroupName = memo(
  ({ marketGroupId, ...otherProps }: MarketGroupNameProps) => {
    const { data, isLoading } = useGetMarketsGroupsMarketGroupId(
      marketGroupId ?? 1,
      {},
      {},
      { query: { enabled: !!marketGroupId } },
    );
    if (isLoading) {
      const placeholder = "Unknown Market Group";
      const skeletonWidth = Math.min(Math.max(placeholder.length, 4), 24);
      return (
        <Text {...otherProps}>
          <Skeleton
            component="span"
            style={{ display: "inline-block" }}
            height="1em"
            width={`${skeletonWidth}ch`}
          />
        </Text>
      );
    }
    return <Text {...otherProps}>{data?.data.name}</Text>;
  },
);
MarketGroupName.displayName = "MarketGroupName";
