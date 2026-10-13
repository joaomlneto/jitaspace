"use client";

import type { BreadcrumbsProps, TextProps } from "@mantine/core";
import { memo } from "react";
import { Breadcrumbs } from "@mantine/core";

import {
  ConstellationName,
  RegionName,
  SolarSystemName,
} from "@jitaspace/eve-components";

import {
  ConstellationAnchor,
  RegionAnchor,
  SolarSystemAnchor,
} from "~/components/Anchor";

export type SolarSystemBreadcrumbsDisplayProps = Omit<
  BreadcrumbsProps,
  "children"
> & {
  solarSystemId?: string | number;
  constellationId?: number;
  regionId?: number;
  hideSolarSystem?: boolean;
  textProps?: TextProps;
};

export const SolarSystemBreadcrumbsDisplay = memo(
  ({
    solarSystemId,
    constellationId,
    regionId,
    hideSolarSystem = false,
    textProps = {},
    ...otherProps
  }: SolarSystemBreadcrumbsDisplayProps) => {
    return (
      <Breadcrumbs {...otherProps}>
        <RegionAnchor regionId={regionId}>
          <RegionName regionId={regionId} {...textProps} />
        </RegionAnchor>
        <ConstellationAnchor constellationId={constellationId}>
          <ConstellationName constellationId={constellationId} {...textProps} />
        </ConstellationAnchor>
        {!hideSolarSystem && (
          <SolarSystemAnchor solarSystemId={solarSystemId}>
            <SolarSystemName solarSystemId={solarSystemId} {...textProps} />
          </SolarSystemAnchor>
        )}
      </Breadcrumbs>
    );
  },
);
SolarSystemBreadcrumbsDisplay.displayName = "SolarSystemBreadcrumbsDisplay";
