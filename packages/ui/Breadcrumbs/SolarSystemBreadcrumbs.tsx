import React, { memo } from "react";
import { Breadcrumbs, type BreadcrumbsProps } from "@mantine/core";

import { useGetSolarSystemById } from "@jitaspace/sde-client";

import {
  ConstellationAnchor,
  RegionAnchor,
  SolarSystemAnchor,
} from "../Anchor";
import { ConstellationName, RegionName, SolarSystemName } from "../Text";

export type SolarSystemBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  solarSystemId?: string | number;
};

export const SolarSystemBreadcrumbs = memo(
  ({ solarSystemId, ...otherProps }: SolarSystemBreadcrumbsProps) => {
    const { data } = useGetSolarSystemById(
      typeof solarSystemId === "string"
        ? parseInt(solarSystemId)
        : solarSystemId ?? 0,
      {
        query: { enabled: solarSystemId !== undefined },
      },
    );
    return (
      <Breadcrumbs {...otherProps}>
        <RegionAnchor regionId={data?.regionID}>
          <RegionName regionId={data?.regionID} />
        </RegionAnchor>
        <ConstellationAnchor constellationId={data?.constellationID}>
          <ConstellationName constellationId={data?.constellationID} />
        </ConstellationAnchor>
        <SolarSystemAnchor solarSystemId={solarSystemId}>
          <SolarSystemName solarSystemId={solarSystemId} />
        </SolarSystemAnchor>
      </Breadcrumbs>
    );
  },
);
SolarSystemBreadcrumbs.displayName = "SolarSystemBreadcrumbs";
