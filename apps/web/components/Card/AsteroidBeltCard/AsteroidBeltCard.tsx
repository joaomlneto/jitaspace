"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useAsteroidBelt } from "@jitaspace/hooks";
import { AsteroidBeltName, SolarSystemName } from "@jitaspace/ui";

import classes from "./AsteroidBeltCard.module.css";

export type AsteroidBeltCardProps = Omit<CardProps, "children"> & {
  asteroidBeltId: number;
};

export const AsteroidBeltCard = memo(
  ({ asteroidBeltId, ...otherProps }: AsteroidBeltCardProps) => {
    const { data: asteroidBelt } = useAsteroidBelt(asteroidBeltId);

    return (
      <Card withBorder radius="md" className={classes.card} {...otherProps}>
        <Card.Section className={classes.imageSection}>
          <Group wrap="nowrap" align="start">
            <div style={{ flex: 1 }}>
              <AsteroidBeltName
                asteroidBeltId={asteroidBeltId}
                fz="lg"
                fw={500}
                className={classes.headerName}
              />
              {asteroidBelt?.data.system_id && (
                <SolarSystemName
                  solarSystemId={asteroidBelt.data.system_id}
                  size="xs"
                  c="dimmed"
                />
              )}
            </div>
          </Group>
        </Card.Section>
      </Card>
    );
  },
);
AsteroidBeltCard.displayName = "AsteroidBeltCard";
