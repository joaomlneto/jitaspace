"use client";

import { memo } from "react";
import { type AvatarProps } from "@mantine/core";
import { usePlanet } from "@jitaspace/hooks";
import { PlanetAvatar as UIPlanetAvatar } from "@jitaspace/ui";

export type PlanetAvatarProps = Omit<AvatarProps, "src"> & {
  planetId?: number;
};

export const PlanetAvatar = memo(({ planetId, ...otherProps }: PlanetAvatarProps) => {
  const { data } = usePlanet(planetId ?? 0);
  return <UIPlanetAvatar typeId={data?.data.type_id} {...otherProps} />;
});
PlanetAvatar.displayName = "PlanetAvatar";
