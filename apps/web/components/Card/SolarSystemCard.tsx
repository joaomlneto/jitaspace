import type { CardProps } from "@mantine/core";
import _React, { memo } from "react";
import { Card, Group } from "@mantine/core";

import { useSolarSystem } from "@jitaspace/hooks";
import {
  SolarSystemBreadcrumbs,
  SolarSystemName,
  SolarSystemSecurityStatusBadge,
  SolarSystemSovereigntyAvatar,
} from "@jitaspace/ui";

import classes from "./SolarSystemCard.module.css";

export type SolarSystemCardProps = Omit<CardProps, "children"> & {
  solarSystemId: number;
};

export const SolarSystemCard = memo(
  ({ solarSystemId, ...otherProps }: SolarSystemCardProps) => {
    const { data: _data } = useSolarSystem(solarSystemId);

    return (
      <Card withBorder p={0} m={0} className={classes.card} {...otherProps}>
        <Group p="xs" wrap="nowrap">
          <SolarSystemSovereigntyAvatar
            solarSystemId={solarSystemId}
            size="md"
          />
          <div>
            <Group>
              <SolarSystemSecurityStatusBadge
                solarSystemId={solarSystemId}
                size="xs"
              />
              <SolarSystemName
                solarSystemId={solarSystemId}
                size="sm"
                fw={500}
                lineClamp={1}
              />
            </Group>
            <SolarSystemBreadcrumbs
              textProps={{ size: "xs" }}
              solarSystemId={solarSystemId}
              hideSolarSystem
            />
          </div>
        </Group>
      </Card>
    );
  },
);
SolarSystemCard.displayName = "SolarSystemCard";
