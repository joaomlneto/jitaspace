import React, { memo } from "react";
import { Text, type TextProps } from "@mantine/core";

import { useGetUniverseStargatesStargateId } from "@jitaspace/esi-client-kubb";





export type StargateNameProps = TextProps & {
  stargateId?: number;
};
export const StargateName = memo(
  ({ stargateId, ...otherProps }: StargateNameProps) => {
    const { data } = useGetUniverseStargatesStargateId(
      stargateId ?? 0,
      {},
      {},
      { query: { enabled: !!stargateId } },
    );
    return <Text {...otherProps}>{data?.data.name}</Text>;
  },
);
StargateName.displayName = "StargateName";
