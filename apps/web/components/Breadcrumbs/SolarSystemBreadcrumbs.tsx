"use client";

import { memo } from "react";
import { type BreadcrumbsProps, type TextProps } from "@mantine/core";
import { useConstellation, useSolarSystem } from "@jitaspace/hooks";
import { SolarSystemBreadcrumbs as UISolarSystemBreadcrumbs } from "@jitaspace/ui";

export type SolarSystemBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  solarSystemId?: string | number;
  hideSolarSystem?: boolean;
  textProps?: TextProps;
};

export const SolarSystemBreadcrumbs = memo(
  ({ solarSystemId, hideSolarSystem, textProps, ...otherProps }: SolarSystemBreadcrumbsProps) => {
    const solarSystemIdNum = typeof solarSystemId === "string"
      ? parseInt(solarSystemId)
      : solarSystemId;
    const { data: solarSystem } = useSolarSystem(solarSystemIdNum ?? 0);
    const constellationId = solarSystem?.data.constellation_id;
    const { data: constellation } = useConstellation(constellationId ?? 0);
    const regionId = constellation?.data.region_id;

    return (
      <UISolarSystemBreadcrumbs
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
