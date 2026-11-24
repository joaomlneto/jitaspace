"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { usePlanet } from "@jitaspace/hooks";
import { PlanetAvatar as UIPlanetAvatar } from "@jitaspace/ui";

export type PlanetAvatarProps = Omit<AvatarProps, "src"> & {
  planetId?: number;
};

export const PlanetAvatar = memo(
  ({ planetId, ...otherProps }: PlanetAvatarProps) => {
    const { data } = usePlanet(planetId);
    return <UIPlanetAvatar typeId={data?.typeID} {...otherProps} />;
  },
);
PlanetAvatar.displayName = "PlanetAvatar";
