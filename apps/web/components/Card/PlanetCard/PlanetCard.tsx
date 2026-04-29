"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { usePlanet } from "@jitaspace/hooks";
import { PlanetAvatar, PlanetName, SolarSystemName } from "@jitaspace/ui";

import classes from "./PlanetCard.module.css";

export type PlanetCardProps = Omit<CardProps, "children"> & {
  planetId: number;
};

export const PlanetCard = memo(
  ({ planetId, ...otherProps }: PlanetCardProps) => {
    const { data: planet } = usePlanet(planetId);

    return (
      <Card withBorder radius="md" className={classes.card} {...otherProps}>
        <Card.Section className={classes.imageSection}>
          <Group wrap="nowrap" align="start">
            <PlanetAvatar planetId={planetId} size={64} radius="md" />
            <div style={{ flex: 1 }}>
              <PlanetName
                planetId={planetId}
                fz="lg"
                fw={500}
                className={classes.headerName}
              />
              {planet?.data.system_id && (
                <SolarSystemName
                  solarSystemId={planet.data.system_id}
                  size="xs"
                  c="dimmed"
                />
              )}
              {planet?.data.type_id && (
                <Text size="xs" c="dimmed">
                  Type ID: {planet.data.type_id}
                </Text>
              )}
            </div>
          </Group>
        </Card.Section>
      </Card>
    );
  },
);
PlanetCard.displayName = "PlanetCard";
