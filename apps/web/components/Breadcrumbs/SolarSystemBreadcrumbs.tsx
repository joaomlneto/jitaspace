"use client";

import type { BreadcrumbsProps, TextProps } from "@mantine/core";
import { memo } from "react";

import { useConstellation, useSolarSystem } from "@jitaspace/hooks";

import { SolarSystemBreadcrumbsDisplay } from "./SolarSystemBreadcrumbsDisplay";

export type SolarSystemBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  solarSystemId?: string | number;
  hideSolarSystem?: boolean;
  textProps?: TextProps;
};

export const SolarSystemBreadcrumbs = memo(
  ({
    solarSystemId,
    hideSolarSystem,
    textProps,
    ...otherProps
  }: SolarSystemBreadcrumbsProps) => {
    const solarSystemIdNum =
      typeof solarSystemId === "string"
        ? Number.parseInt(solarSystemId)
        : solarSystemId;
    const { data: solarSystem } = useSolarSystem(solarSystemIdNum);
    const constellationId = solarSystem?.constellationID;
    const { data: constellation } = useConstellation(constellationId);
    const regionId = constellation?.regionID;

    return (
      <SolarSystemBreadcrumbsDisplay
        solarSystemId={solarSystemId}
        constellationId={constellationId}
        regionId={regionId}
        hideSolarSystem={hideSolarSystem}
        textProps={textProps}
        {...otherProps}
      />
    );
  },
);
SolarSystemBreadcrumbs.displayName = "SolarSystemBreadcrumbs";
