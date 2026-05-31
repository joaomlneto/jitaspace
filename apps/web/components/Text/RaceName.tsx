"use client";

import { memo } from "react";
import { type TextProps } from "@mantine/core";
import { useRace } from "@jitaspace/hooks";
import { RaceName as UIRaceName } from "@jitaspace/ui";

export type RaceNameProps = TextProps & {
  raceId?: number;
};

export const RaceName = memo(({ raceId, ...otherProps }: RaceNameProps) => {
  const { data: race } = useRace(raceId ?? 0);
  return <UIRaceName name={race?.name} {...otherProps} />;
});
RaceName.displayName = "RaceName";
