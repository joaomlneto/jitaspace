import React, { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { useGetUniverseStationsStationId } from "@jitaspace/esi-client-kubb";

import { TypeAvatar } from "./TypeAvatar";


export type StationAvatarProps = Omit<AvatarProps, "src"> & {
  stationId?: string | number | null;
};

export const StationAvatar = memo(
  ({ stationId, ...otherProps }: StationAvatarProps) => {
    const { data } = useGetUniverseStationsStationId(
      typeof stationId === "string" ? parseInt(stationId) : stationId ?? 1,
      {},
      {},
      {
        query: {
          enabled: !!stationId,
        },
      },
    );

    return (
      <TypeAvatar
        typeId={data?.data.type_id}
        variation="render"
        size={otherProps.size}
        {...otherProps}
      />
    );
  },
);
StationAvatar.displayName = "StationAvatar";
