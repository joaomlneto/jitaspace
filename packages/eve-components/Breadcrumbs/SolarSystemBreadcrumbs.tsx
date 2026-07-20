"use client";

import type { BreadcrumbsProps, TextProps } from "@mantine/core";
import { memo } from "react";
import { Breadcrumbs } from "@mantine/core";

import {
  ConstellationAnchor,
  RegionAnchor,
  SolarSystemAnchor,
} from "../Anchor";
import { ConstellationName, RegionName, SolarSystemName } from "../Text";

export type SolarSystemBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  solarSystemId?: string | number;
  constellationId?: number;
  regionId?: number;
  hideSolarSystem?: boolean;
  textProps?: TextProps;
};

export const SolarSystemBreadcrumbs = memo(
  ({
    solarSystemId,
    constellationId,
    regionId,
    hideSolarSystem = false,
    textProps = {},
    ...otherProps
  }: SolarSystemBreadcrumbsProps) => {
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
SolarSystemBreadcrumbs.displayName = "SolarSystemBreadcrumbs";
