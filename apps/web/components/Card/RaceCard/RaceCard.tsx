"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useRace } from "@jitaspace/hooks";
import { RaceAvatar, RaceName } from "@jitaspace/ui";

import classes from "./RaceCard.module.css";

export type RaceCardProps = Omit<CardProps, "children"> & {
  raceId: number;
};

export const RaceCard = memo(({ raceId, ...otherProps }: RaceCardProps) => {
  const { data: race } = useRace(raceId);

  return (
    <Card withBorder radius="md" className={classes.card} {...otherProps}>
      <Card.Section className={classes.imageSection}>
        <Group wrap="nowrap" align="start">
          <RaceAvatar raceId={raceId} size={64} radius="md" />
          <div style={{ flex: 1 }}>
            <RaceName
              raceId={raceId}
              fz="lg"
              fw={500}
              className={classes.headerName}
            />
            {race?.description && (
              <Text size="xs" c="dimmed" lineClamp={2}>
                {race.description}
              </Text>
            )}
          </div>
        </Group>
      </Card.Section>
    </Card>
  );
});
RaceCard.displayName = "RaceCard";
