"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useWar } from "@jitaspace/hooks";
import {
  FormattedDateText,
  WarAggressorAvatar,
  WarAggressorName,
  WarDefenderAvatar,
  WarDefenderName,
} from "@jitaspace/ui";

import classes from "./WarCard.module.css";

export type WarCardProps = Omit<CardProps, "children"> & {
  warId: number;
};

export const WarCard = memo(({ warId, ...otherProps }: WarCardProps) => {
  const { data: war } = useWar(warId);

  return (
    <Card withBorder radius="md" className={classes.card} {...otherProps}>
      <Card.Section className={classes.imageSection}>
        <Group wrap="nowrap" justify="space-between">
          <Text fw={700} className={classes.headerName}>
            War #{warId}
          </Text>
          <Group gap="xs">
            {war?.data.declared && (
              <FormattedDateText
                date={new Date(war.data.declared)}
                size="xs"
                c="dimmed"
              />
            )}
          </Group>
        </Group>

        <Group mt="md" wrap="nowrap" grow>
          <Group wrap="nowrap">
            <WarAggressorAvatar warId={warId} size={48} radius="md" />
            <div style={{ flex: 1 }}>
              <Text size="xs" c="dimmed">
                Aggressor
              </Text>
              <WarAggressorName warId={warId} fw={500} size="sm" />
            </div>
          </Group>

          <Group wrap="nowrap">
            <WarDefenderAvatar warId={warId} size={48} radius="md" />
            <div style={{ flex: 1 }}>
              <Text size="xs" c="dimmed">
                Defender
              </Text>
              <WarDefenderName warId={warId} fw={500} size="sm" />
            </div>
          </Group>
        </Group>
      </Card.Section>
    </Card>
  );
});
WarCard.displayName = "WarCard";
