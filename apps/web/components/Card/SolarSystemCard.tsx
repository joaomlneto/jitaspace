import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group } from "@mantine/core";

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
    return (
      <Card withBorder radius="md" className={classes.card} {...otherProps}>
        <Card.Section className={classes.imageSection}>
          <Group wrap="nowrap" align="start">
            <SolarSystemSovereigntyAvatar
              solarSystemId={solarSystemId}
              size={64}
              radius="md"
            />
            <div>
              <Group gap="xs" align="center">
                <SolarSystemSecurityStatusBadge
                  solarSystemId={solarSystemId}
                  size="xs"
                />
                <SolarSystemName
                  solarSystemId={solarSystemId}
                  fz="lg"
                  fw={500}
                  className={classes.headerName}
                />
              </Group>
              <SolarSystemBreadcrumbs
                textProps={{ size: "xs", c: "dimmed" }}
                solarSystemId={solarSystemId}
                hideSolarSystem
              />
            </div>
          </Group>
        </Card.Section>
      </Card>
    );
  },
);
SolarSystemCard.displayName = "SolarSystemCard";
