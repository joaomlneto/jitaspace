"use client";

import type { CardProps } from "@mantine/core";
import { Card, Group, Text } from "@mantine/core";

import { useDogmaAttribute } from "@jitaspace/hooks";
import { DogmaAttributeName, EveIconAvatar } from "@jitaspace/ui";

import classes from "./DogmaAttributeCard.module.css";

export type DogmaAttributeCardProps = CardProps & {
  attributeId: number;
};

export const DogmaAttributeCard = ({
  attributeId,
  ...otherProps
}: DogmaAttributeCardProps) => {
  const { data: attribute } = useDogmaAttribute(attributeId);

  return (
    <Card withBorder radius="md" className={classes.card} {...otherProps}>
      <Card.Section className={classes.imageSection}>
        <Group wrap="nowrap" align="start">
          <EveIconAvatar
            iconId={attribute?.data.icon_id}
            size={96}
            radius="md"
          />
          <div>
            <DogmaAttributeName
              attributeId={attributeId}
              fz="lg"
              fw={500}
              className={classes.headerName}
            />

            {attribute?.data.description && (
              <Text size="xs" mt={4} lineClamp={3}>
                {attribute.data.description}
              </Text>
            )}

            <Group wrap="nowrap" gap="xs" mt={4}>
              <Text size="xs" c="dimmed">
                Default Value:
              </Text>
              <Text size="xs">{attribute?.data.default_value}</Text>
            </Group>

            <Group wrap="nowrap" gap="xs" mt={4}>
              <Text size="xs" c="dimmed">
                Internal Name:
              </Text>
              <Text size="xs">{attribute?.data.name}</Text>
            </Group>
          </div>
        </Group>
      </Card.Section>
    </Card>
  );
};
