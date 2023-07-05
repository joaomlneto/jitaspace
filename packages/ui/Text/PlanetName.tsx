import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetUniversePlanetsPlanetId } from "@jitaspace/esi-client";

export type PlanetNameProps = TextProps & {
  planetId?: number;
};

export const PlanetName = memo(
  ({ planetId, ...otherProps }: PlanetNameProps) => {
    const { data, isLoading } = useGetUniversePlanetsPlanetId(
      planetId ?? 1,
      {},
      { swr: { enabled: !!planetId } },
    );
    if (isLoading)
      return (
        <Skeleton>
          <Text {...otherProps}>Unknown planet</Text>
        </Skeleton>
      );
    return <Text {...otherProps}>{data?.data.name}</Text>;
  },
);
PlanetName.displayName = "PlanetName";
