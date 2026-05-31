"use client";

import { memo } from "react";
import { type TextProps } from "@mantine/core";
import { usePlanet } from "@jitaspace/hooks";
import { PlanetName as UIPlanetName } from "@jitaspace/ui";

export type PlanetNameProps = TextProps & {
  planetId?: number;
};

export const PlanetName = memo(({ planetId, ...otherProps }: PlanetNameProps) => {
  const { data } = usePlanet(planetId ?? 0);
  return <UIPlanetName name={data?.data.name} {...otherProps} />;
});
PlanetName.displayName = "PlanetName";
