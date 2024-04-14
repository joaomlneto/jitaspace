"use client";

import React, { memo } from "react";
import { Breadcrumbs, TextProps, type BreadcrumbsProps } from "@mantine/core";

import {
  useGetUniverseConstellationsConstellationId,
  useGetUniverseSystemsSystemId,
} from "@jitaspace/esi-client";

import {
  ConstellationAnchor,
  RegionAnchor,
  SolarSystemAnchor,
} from "../Anchor";
import { ConstellationName, RegionName, SolarSystemName } from "../Text";


export type SolarSystemBreadcrumbsProps = Omit<BreadcrumbsProps, "children"> & {
  solarSystemId?: string | number;
  hideSolarSystem?: boolean;
  textProps?: TextProps;
};

export const SolarSystemBreadcrumbs = memo(
  ({
    solarSystemId,
    hideSolarSystem = false,
    textProps = {},
    ...otherProps
  }: SolarSystemBreadcrumbsProps) => {
    const { data: solarSystem } = useGetUniverseSystemsSystemId(
      typeof solarSystemId === "string"
        ? parseInt(solarSystemId)
        : solarSystemId ?? 0,
      {},
      {},
      {
        query: { enabled: solarSystemId !== undefined },
      },
    );
    const { data: constellation } = useGetUniverseConstellationsConstellationId(
      solarSystem?.data.constellation_id ?? 0,
      {},
      {},
      {
        query: {
          enabled: solarSystem?.data.constellation_id !== undefined,
        },
      },
    );
    return (
      <Breadcrumbs {...otherProps}>
        <RegionAnchor regionId={constellation?.data.region_id}>
          <RegionName regionId={constellation?.data.region_id} {...textProps} />
        </RegionAnchor>
        <ConstellationAnchor
          constellationId={solarSystem?.data.constellation_id}
        >
          <ConstellationName
            constellationId={solarSystem?.data.constellation_id}
            {...textProps}
          />
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
