"use client";

import { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { useGetUniverseSystemsSystemId } from "@jitaspace/esi-client";

import { StarAvatar } from "./StarAvatar";


export type SolarSystemAvatarProps = Omit<AvatarProps, "src"> & {
  solarSystemId?: string | number | null;
};

export const SolarSystemAvatar = memo(
  ({ solarSystemId, ...otherProps }: SolarSystemAvatarProps) => {
    const { data } = useGetUniverseSystemsSystemId(
      typeof solarSystemId === "string"
        ? parseInt(solarSystemId)
        : solarSystemId ?? 1,
      {},
      {},
      {
        query: {
          enabled: !!solarSystemId,
        },
      },
    );

    return (
      <StarAvatar
        starId={data?.data.star_id}
        size={otherProps.size}
        {...otherProps}
      />
    );
  },
);
SolarSystemAvatar.displayName = "SolarSystemAvatar";
