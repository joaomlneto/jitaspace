"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { useSolarSystem, useStar } from "@jitaspace/hooks";
import { SolarSystemStarAvatar as UISolarSystemStarAvatar } from "@jitaspace/ui";

export type SolarSystemStarAvatarProps = Omit<AvatarProps, "src"> & {
  solarSystemId?: number;
};

export const SolarSystemStarAvatar = memo(
  ({ solarSystemId, ...otherProps }: SolarSystemStarAvatarProps) => {
    const { data: solarSystem } = useSolarSystem(solarSystemId ?? 0);
    const starId = solarSystem?.data.star_id;
    const { data: star } = useStar(starId ?? 0);
    return (
      <UISolarSystemStarAvatar typeId={star?.data.type_id} {...otherProps} />
    );
  },
);
SolarSystemStarAvatar.displayName = "SolarSystemStarAvatar";
