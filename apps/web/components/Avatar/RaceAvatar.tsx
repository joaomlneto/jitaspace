"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { useRace } from "@jitaspace/hooks";
import { EveIconAvatar } from "@jitaspace/ui";

export type RaceAvatarProps = Omit<AvatarProps, "src"> & {
  raceId?: number;
};

/** The race's own icon, as the SDE gives it (the same art as its empire's). */
export const RaceAvatar = memo(({ raceId, ...otherProps }: RaceAvatarProps) => {
  const { data: race } = useRace(raceId);
  return (
    <EveIconAvatar iconId={race?.iconID} alt={race?.name} {...otherProps} />
  );
});
RaceAvatar.displayName = "RaceAvatar";
