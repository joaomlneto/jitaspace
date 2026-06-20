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
  const factionId = (race as { faction_id?: number } | undefined)?.faction_id;
  return <UIRaceAvatar factionId={factionId?.toString()} {...otherProps} />;
});
RaceAvatar.displayName = "RaceAvatar";
