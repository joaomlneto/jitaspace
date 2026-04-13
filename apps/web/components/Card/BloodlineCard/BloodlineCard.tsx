"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useBloodline } from "@jitaspace/hooks";
import { BloodlineName, RaceName } from "@jitaspace/ui";

import classes from "./BloodlineCard.module.css";

export type BloodlineCardProps = Omit<CardProps, "children"> & {
  bloodlineId: number;
};

export const BloodlineCard = memo(
  ({ bloodlineId, ...otherProps }: BloodlineCardProps) => {
    const { data: bloodline } = useBloodline(bloodlineId);

    return (
      <Card withBorder radius="md" className={classes.card} {...otherProps}>
        <Card.Section className={classes.imageSection}>
          <Group wrap="nowrap" align="start">
            <div style={{ flex: 1 }}>
              <BloodlineName
                bloodlineId={bloodlineId}
                fz="lg"
                fw={500}
                className={classes.headerName}
              />
              {bloodline?.race_id && (
                <RaceName raceId={bloodline.race_id} size="xs" c="dimmed" />
              )}
              {bloodline?.description && (
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {bloodline.description}
                </Text>
              )}
            </div>
          </Group>
        </Card.Section>
      </Card>
    );
  },
);
BloodlineCard.displayName = "BloodlineCard";
