"use client";

import { memo } from "react";
import { type AvatarProps } from "@mantine/core";
import { useStation } from "@jitaspace/hooks";
import { StationAvatar as UIStationAvatar } from "@jitaspace/ui";

export type StationAvatarProps = Omit<AvatarProps, "src"> & {
  stationId?: number;
};

export const StationAvatar = memo(({ stationId, ...otherProps }: StationAvatarProps) => {
  const { data } = useStation(stationId ?? 0);
  return <UIStationAvatar typeId={data?.data.type_id} {...otherProps} />;
});
StationAvatar.displayName = "StationAvatar";
