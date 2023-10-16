import { memo, useMemo } from "react";
import { type AvatarProps } from "@mantine/core";

import { useGetUniverseRaces } from "@jitaspace/esi-client";

import { FactionAvatar } from "./FactionAvatar";

export type RaceAvatarProps = Omit<AvatarProps, "src"> & {
  raceId?: string | number | null;
};

export const RaceAvatar = memo(({ raceId, ...otherProps }: RaceAvatarProps) => {
  const { data } = useGetUniverseRaces();

  const race = useMemo(
    () => data?.data.find((r) => r.race_id == raceId),
    [data?.data, raceId],
  );

  return <FactionAvatar factionId={`${race?.alliance_id}`} {...otherProps} />;
});
RaceAvatar.displayName = "RaceAvatar";
