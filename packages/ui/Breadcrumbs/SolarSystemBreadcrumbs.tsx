import React, { memo } from "react";
import { Breadcrumbs, type BreadcrumbsProps } from "@mantine/core";

import {
  useGetUniverseConstellationsConstellationId,
  useGetUniverseSystemsSystemId,
} from "@jitaspace/esi-client-kubb";

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
    const { data: solarSystem } = useGetUniverseSystemsSystemId(
      typeof solarSystemId === "string"
        ? parseInt(solarSystemId)
        : solarSystemId ?? 0,
      {},
      {
        swr: { enabled: solarSystemId !== undefined },
      },
    );
    const { data: constellation } = useGetUniverseConstellationsConstellationId(
      solarSystem?.data.constellation_id ?? 0,
      {},
      {
        swr: {
          enabled: solarSystem?.data.constellation_id !== undefined,
        },
      },
    );
    return (
      <Breadcrumbs {...otherProps}>
        <RegionAnchor regionId={constellation?.data.region_id}>
          <RegionName regionId={constellation?.data.region_id} />
        </RegionAnchor>
        <ConstellationAnchor
          constellationId={solarSystem?.data.constellation_id}
        >
          <ConstellationName
            constellationId={solarSystem?.data.constellation_id}
          />
        </ConstellationAnchor>
        <SolarSystemAnchor solarSystemId={solarSystemId}>
          <SolarSystemName solarSystemId={solarSystemId} />
        </SolarSystemAnchor>
      </Breadcrumbs>
    );
  },
);
SolarSystemBreadcrumbs.displayName = "SolarSystemBreadcrumbs";
