import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetUniverseRaces } from "@jitaspace/esi-client";

export type RaceNameProps = TextProps & {
  raceId?: string | number;
};

export const RaceName = memo(({ raceId, ...otherProps }: RaceNameProps) => {
  const { data, isLoading } = useGetUniverseRaces();

  const race = data?.data.find((r) => r.race_id == raceId);

  if (!race || isLoading)
    return (
      <Skeleton>
        <Text {...otherProps}>Unknown race</Text>
      </Skeleton>
    );
  return <Text {...otherProps}>{race.name}</Text>;
});
RaceName.displayName = "RaceName";
