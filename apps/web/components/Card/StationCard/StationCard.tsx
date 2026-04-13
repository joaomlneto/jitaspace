import type { CardProps } from "@mantine/core";
import _React, { memo } from "react";
import { Card, Group } from "@mantine/core";

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
      <Card withBorder radius="md" className={classes.card} {...otherProps}>
        <Card.Section className={classes.imageSection}>
          <Group wrap="nowrap" align="start">
            <StationAvatar stationId={stationId} size={64} radius="md" />
            <div style={{ flex: 1 }}>
              <Group gap="xs" wrap="nowrap">
                {data?.data.system_id && (
                  <SolarSystemSecurityStatusBadge
                    solarSystemId={data?.data.system_id}
                    size="xs"
                  />
                )}
                <StationName
                  stationId={stationId}
                  fz="lg"
                  fw={500}
                  className={classes.headerName}
                />
              </Group>
              <SolarSystemBreadcrumbs
                textProps={{ size: "xs", c: "dimmed" }}
                solarSystemId={data?.data.system_id}
              />
            </div>
          </Group>
        </Card.Section>
      </Card>
    );
  },
);
StationCard.displayName = "StationCard";
