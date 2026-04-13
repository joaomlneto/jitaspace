"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useStar } from "@jitaspace/hooks";
import { StarAvatar, StarName } from "@jitaspace/ui";

import classes from "./StarCard.module.css";

export type StarCardProps = Omit<CardProps, "children"> & {
  starId: number;
};

export const StarCard = memo(({ starId, ...otherProps }: StarCardProps) => {
  const { data: star } = useStar(starId);

  return (
    <Card withBorder radius="md" className={classes.card} {...otherProps}>
      <Card.Section className={classes.imageSection}>
        <Group wrap="nowrap" align="start">
          <StarAvatar starId={starId} size={64} radius="md" />
          <div style={{ flex: 1 }}>
            <StarName
              starId={starId}
              fz="lg"
              fw={500}
              className={classes.headerName}
            />
            {star?.data.type_id && (
              <Text size="xs" c="dimmed">
                Type ID: {star.data.type_id}
              </Text>
            )}
            {star?.data.spectral_class && (
              <Text size="xs" c="dimmed">
                Spectral Class: {star.data.spectral_class}
              </Text>
            )}
          </div>
        </Group>
      </Card.Section>
    </Card>
  );
});
StarCard.displayName = "StarCard";
