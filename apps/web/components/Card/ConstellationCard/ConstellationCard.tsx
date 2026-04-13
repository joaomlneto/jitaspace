"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useConstellation } from "@jitaspace/hooks";
import { ConstellationName, RegionName } from "@jitaspace/ui";

import classes from "./ConstellationCard.module.css";

export type ConstellationCardProps = Omit<CardProps, "children"> & {
  constellationId: number;
};

export const ConstellationCard = memo(
  ({ constellationId, ...otherProps }: ConstellationCardProps) => {
    const { data: constellation } = useConstellation(constellationId);

    return (
      <Card withBorder radius="md" className={classes.card} {...otherProps}>
        <Card.Section className={classes.imageSection}>
          <Group wrap="nowrap" align="start">
            <div style={{ flex: 1 }}>
              <ConstellationName
                constellationId={constellationId}
                fz="lg"
                fw={500}
                className={classes.headerName}
              />
              {constellation?.data.region_id && (
                <RegionName
                  regionId={constellation.data.region_id}
                  size="xs"
                  c="dimmed"
                />
              )}
              {constellation?.data.systems && (
                <Text size="xs" c="dimmed">
                  {constellation.data.systems.length} Solar Systems
                </Text>
              )}
            </div>
          </Group>
        </Card.Section>
      </Card>
    );
  },
);
ConstellationCard.displayName = "ConstellationCard";
