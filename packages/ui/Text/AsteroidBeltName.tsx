"use client";

import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetUniverseAsteroidBeltsAsteroidBeltId } from "@jitaspace/esi-client";





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
      {},
      { query: { enabled: !!asteroidBeltId } },
    );
    if (isLoading) {
      const placeholder = "Unknown asteroid belt";
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
AsteroidBeltName.displayName = "AsteroidBeltName";
