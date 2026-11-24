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
    const { data: solarSystem } = useSolarSystem(solarSystemId);
    const starId = solarSystem?.starID;
    const { data: star } = useStar(starId);
    return <UISolarSystemStarAvatar typeId={star?.typeID} {...otherProps} />;
  },
);
SolarSystemStarAvatar.displayName = "SolarSystemStarAvatar";
