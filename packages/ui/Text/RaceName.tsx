"use client";

import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetUniverseRaces } from "@jitaspace/esi-client";





export type RaceNameProps = TextProps & {
  raceId?: string | number;
};

export const RaceName = memo(({ raceId, ...otherProps }: RaceNameProps) => {
  const { data, isLoading } = useGetUniverseRaces();

  const race = data?.data.find((r) => r.race_id == raceId);

  if (!race || isLoading) {
    const placeholder = "Unknown race";
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
  return <Text {...otherProps}>{race.name}</Text>;
});
RaceName.displayName = "RaceName";
