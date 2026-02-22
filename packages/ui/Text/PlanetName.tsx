"use client";

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
      {},
      { query: { enabled: !!planetId } },
    );
    if (isLoading) {
      const placeholder = "Unknown planet";
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
PlanetName.displayName = "PlanetName";
