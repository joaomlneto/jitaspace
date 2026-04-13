"use client";

import type { CardProps } from "@mantine/core";
import { Card, Group, Text } from "@mantine/core";

import { useMarketPrices, useType } from "@jitaspace/hooks";
import { ISKAmount, TypeAvatar, TypeName } from "@jitaspace/ui";

import classes from "./TypeCard.module.css";

export type TypeCardProps = CardProps & {
  typeId: number;
};

export const TypeCard = ({ typeId, ...otherProps }: TypeCardProps) => {
  const { data: type } = useType(typeId);
  const { data: prices } = useMarketPrices();

  const price = prices?.[typeId];

  return (
    <Card withBorder radius="md" className={classes.card} {...otherProps}>
      <Card.Section className={classes.imageSection}>
        <Group wrap="nowrap" align="start">
          <TypeAvatar typeId={typeId} size={96} radius="md" />
          <div>
            <TypeName
              typeId={typeId}
              fz="lg"
              fw={500}
              className={classes.headerName}
            />

            {price && (
              <Group wrap="nowrap" gap="xs" mt={4}>
                <Text size="xs" c="dimmed">
                  Average Price:
                </Text>
                <ISKAmount
                  amount={price.average_price ?? price.adjusted_price}
                  size="xs"
                />
              </Group>
            )}

            {type?.data.volume !== undefined && (
              <Group wrap="nowrap" gap="xs" mt={4}>
                <Text size="xs" c="dimmed">
                  Volume:
                </Text>
                <Text size="xs">{type.data.volume.toLocaleString()} m³</Text>
              </Group>
            )}

            {type?.data.mass !== undefined && (
              <Group wrap="nowrap" gap="xs" mt={4}>
                <Text size="xs" c="dimmed">
                  Mass:
                </Text>
                <Text size="xs">{type.data.mass.toLocaleString()} kg</Text>
              </Group>
            )}
          </div>
        </Group>
      </Card.Section>
    </Card>
  );
};
