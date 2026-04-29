"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useStargate } from "@jitaspace/hooks";
import { StargateAvatar, StargateName } from "@jitaspace/ui";

import classes from "./StargateCard.module.css";

export type StargateCardProps = Omit<CardProps, "children"> & {
  stargateId: number;
};

export const StargateCard = memo(
  ({ stargateId, ...otherProps }: StargateCardProps) => {
    const { data: stargate } = useStargate(stargateId);

    return (
      <Card withBorder radius="md" className={classes.card} {...otherProps}>
        <Card.Section className={classes.imageSection}>
          <Group wrap="nowrap" align="start">
            <StargateAvatar stargateId={stargateId} size={64} radius="md" />
            <div style={{ flex: 1 }}>
              <StargateName
                stargateId={stargateId}
                fz="lg"
                fw={500}
                className={classes.headerName}
              />
              {stargate?.data.destination && (
                <Text size="xs" c="dimmed">
                  Destination Stargate: {stargate.data.destination.stargate_id}
                </Text>
              )}
              {stargate?.data.type_id && (
                <Text size="xs" c="dimmed">
                  Type ID: {stargate.data.type_id}
                </Text>
              )}
            </div>
          </Group>
        </Card.Section>
      </Card>
    );
  },
);
StargateCard.displayName = "StargateCard";
