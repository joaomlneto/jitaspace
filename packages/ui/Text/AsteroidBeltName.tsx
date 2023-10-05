import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetUniverseAsteroidBeltsAsteroidBeltId } from "@jitaspace/esi-client-kubb";

export type AsteroidBeltNameProps = TextProps & {
  asteroidBeltId?: number;
  planetId?: number;
  //roidBeltId?: number;
};

export const AsteroidBeltName = memo(
  ({ asteroidBeltId, ...otherProps }: AsteroidBeltNameProps) => {
    const { data, isLoading } = useGetUniverseAsteroidBeltsAsteroidBeltId(
      asteroidBeltId ?? 1,
      {},
      { swr: { enabled: !!asteroidBeltId } },
    );
    if (isLoading)
      return (
        <Skeleton>
          <Text {...otherProps}>Unknown asteroid belt</Text>
        </Skeleton>
      );
    return <Text {...otherProps}>{data?.data.name}</Text>;
  },
);
AsteroidBeltName.displayName = "AsteroidBeltName";
