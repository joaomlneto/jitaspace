import _React, { memo } from "react";
import { Card, Group  } from "@mantine/core";
import type {CardProps} from "@mantine/core";

import { useStation } from "@jitaspace/hooks";
import {
  SolarSystemBreadcrumbs,
  SolarSystemSecurityStatusBadge,
  StationAvatar,
  StationName,
} from "@jitaspace/ui";

import classes from "./StationCard.module.css";


export type StationCardProps = Omit<CardProps, "children"> & {
  stationId: number;
};

export const StationCard = memo(
  ({ stationId, ...otherProps }: StationCardProps) => {
    const { data } = useStation(stationId);

    return (
      <Card withBorder p={0} m={0} className={classes.card} {...otherProps}>
        <Group p="xs" wrap="nowrap">
          <StationAvatar stationId={stationId} size="md" />
          <div>
            <Group gap="xs" wrap="nowrap">
              {data?.data.system_id && (
                <SolarSystemSecurityStatusBadge
                  solarSystemId={data?.data.system_id}
                  size="xs"
                  w={42}
                />
              )}
              <StationName
                stationId={stationId}
                size="sm"
                fw={500}
                lineClamp={1}
              />
            </Group>
            <SolarSystemBreadcrumbs
              textProps={{ size: "xs" }}
              solarSystemId={data?.data.system_id}
            />
          </div>
        </Group>
      </Card>
    );
  },
);
StationCard.displayName = "StationCard";
