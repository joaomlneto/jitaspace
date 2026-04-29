"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useRegion } from "@jitaspace/hooks";
import { RegionName } from "@jitaspace/ui";

import classes from "./RegionCard.module.css";

export type RegionCardProps = Omit<CardProps, "children"> & {
  regionId: number;
};

export const RegionCard = memo(
  ({ regionId, ...otherProps }: RegionCardProps) => {
    const { data: region } = useRegion(regionId);

    return (
      <Card withBorder radius="md" className={classes.card} {...otherProps}>
        <Card.Section className={classes.imageSection}>
          <Group wrap="nowrap" align="start">
            <div style={{ flex: 1 }}>
              <RegionName
                regionId={regionId}
                fz="lg"
                fw={500}
                className={classes.headerName}
              />
              {region?.data.description && (
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {region.data.description}
                </Text>
              )}
              {region?.data.constellations && (
                <Text size="xs" c="dimmed">
                  {region.data.constellations.length} Constellations
                </Text>
              )}
            </div>
          </Group>
        </Card.Section>
      </Card>
    );
  },
);
RegionCard.displayName = "RegionCard";
