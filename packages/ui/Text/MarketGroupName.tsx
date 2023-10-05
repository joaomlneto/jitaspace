import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetMarketsGroupsMarketGroupId } from "@jitaspace/esi-client-kubb";

export type MarketGroupNameProps = TextProps & {
  marketGroupId?: number;
};

export const MarketGroupName = memo(
  ({ marketGroupId, ...otherProps }: MarketGroupNameProps) => {
    const { data, isLoading } = useGetMarketsGroupsMarketGroupId(
      marketGroupId ?? 1,
      {},
      { swr: { enabled: !!marketGroupId } },
    );
    if (isLoading)
      return (
        <Skeleton>
          <Text {...otherProps}>Unknown Market Group</Text>
        </Skeleton>
      );
    return <Text {...otherProps}>{data?.data.name}</Text>;
  },
);
MarketGroupName.displayName = "MarketGroupName";
