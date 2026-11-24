"use client";

import type { TextProps } from "@mantine/core";
import { memo } from "react";

import { usePlanet } from "@jitaspace/hooks";
import { PlanetName as UIPlanetName } from "@jitaspace/ui";

export type PlanetNameProps = TextProps & {
  planetId?: number;
};

export const PlanetName = memo(
  ({ planetId, ...otherProps }: PlanetNameProps) => {
    const { data } = usePlanet(planetId);
    return <UIPlanetName name={data?.name} {...otherProps} />;
  },
);
PlanetName.displayName = "PlanetName";
