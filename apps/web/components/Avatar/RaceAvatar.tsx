"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { useRace } from "@jitaspace/hooks";
import { RaceAvatar as UIRaceAvatar } from "@jitaspace/ui";

export type RaceAvatarProps = Omit<AvatarProps, "src"> & {
  raceId?: number;
};

export const RaceAvatar = memo(({ raceId, ...otherProps }: RaceAvatarProps) => {
  const { data: race } = useRace(raceId ?? 0);
  // ESI calls the race's faction its `alliance_id`; there is no `faction_id`.
  return (
    <UIRaceAvatar factionId={race?.alliance_id.toString()} {...otherProps} />
  );
});
RaceAvatar.displayName = "RaceAvatar";
