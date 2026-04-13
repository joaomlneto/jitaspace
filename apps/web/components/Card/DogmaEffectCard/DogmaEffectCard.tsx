"use client";

import type { CardProps } from "@mantine/core";
import { Card, Group, Text } from "@mantine/core";

import { useDogmaEffect } from "@jitaspace/hooks";
import { DogmaEffectName, EveIconAvatar } from "@jitaspace/ui";

import classes from "./DogmaEffectCard.module.css";

export type DogmaEffectCardProps = CardProps & {
  effectId: number;
};

export const DogmaEffectCard = ({
  effectId,
  ...otherProps
}: DogmaEffectCardProps) => {
  const { data: effect } = useDogmaEffect(effectId);

  return (
    <Card withBorder radius="md" className={classes.card} {...otherProps}>
      <Card.Section className={classes.imageSection}>
        <Group wrap="nowrap" align="start">
          <EveIconAvatar iconId={effect?.data.icon_id} size={96} radius="md" />
          <div>
            <DogmaEffectName
              effectId={effectId}
              fz="lg"
              fw={500}
              className={classes.headerName}
            />

            {effect?.data.description && (
              <Text size="xs" mt={4} lineClamp={3}>
                {effect.data.description}
              </Text>
            )}

            <Group wrap="nowrap" gap="xs" mt={4}>
              <Text size="xs" c="dimmed">
                Category:
              </Text>
              <Text size="xs">{effect?.data.effect_category}</Text>
            </Group>

            <Group wrap="nowrap" gap="xs" mt={4}>
              <Text size="xs" c="dimmed">
                Internal Name:
              </Text>
              <Text size="xs">{effect?.data.name}</Text>
            </Group>
          </div>
        </Group>
      </Card.Section>
    </Card>
  );
};
