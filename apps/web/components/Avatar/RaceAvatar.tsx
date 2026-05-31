"use client";

import { memo } from "react";
import { type AvatarProps } from "@mantine/core";
import { useRace } from "@jitaspace/hooks";
import { RaceAvatar as UIRaceAvatar } from "@jitaspace/ui";

export type RaceAvatarProps = Omit<AvatarProps, "src"> & {
  raceId?: number;
};

export const RaceAvatar = memo(({ raceId, ...otherProps }: RaceAvatarProps) => {
  const { data: race } = useRace(raceId ?? 0);
  return <UIRaceAvatar factionId={race?.faction_id?.toString()} {...otherProps} />;
});
RaceAvatar.displayName = "RaceAvatar";
