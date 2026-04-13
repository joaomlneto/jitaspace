"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useFaction } from "@jitaspace/hooks";
import { FactionAvatar, FactionName } from "@jitaspace/ui";

import classes from "./FactionCard.module.css";

export type FactionCardProps = Omit<CardProps, "children"> & {
  factionId: number;
};

export const FactionCard = memo(
  ({ factionId, ...otherProps }: FactionCardProps) => {
    const { data: faction } = useFaction(factionId);

    return (
      <Card withBorder radius="md" className={classes.card} {...otherProps}>
        <Card.Section className={classes.imageSection}>
          <Group wrap="nowrap" align="start">
            <FactionAvatar factionId={factionId} size={64} radius="md" />
            <div style={{ flex: 1 }}>
              <FactionName
                factionId={factionId}
                fz="lg"
                fw={500}
                className={classes.headerName}
              />
              {faction?.description && (
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {faction.description}
                </Text>
              )}
            </div>
          </Group>
        </Card.Section>
      </Card>
    );
  },
);
FactionCard.displayName = "FactionCard";
