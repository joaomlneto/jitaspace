"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useMarketGroup } from "@jitaspace/hooks";
import { MarketGroupAvatar, MarketGroupName } from "@jitaspace/ui";

import classes from "./MarketGroupCard.module.css";

export type MarketGroupCardProps = Omit<CardProps, "children"> & {
  marketGroupId: number;
};

export const MarketGroupCard = memo(
  ({ marketGroupId, ...otherProps }: MarketGroupCardProps) => {
    const marketGroup = useMarketGroup(marketGroupId);

    return (
      <Card withBorder radius="md" className={classes.card} {...otherProps}>
        <Card.Section className={classes.imageSection}>
          <Group wrap="nowrap" align="start">
            <MarketGroupAvatar
              marketGroupId={marketGroupId}
              size={64}
              radius="md"
            />
            <div style={{ flex: 1 }}>
              <MarketGroupName
                marketGroupId={marketGroupId}
                fz="lg"
                fw={500}
                className={classes.headerName}
              />
              {marketGroup?.description && (
                <Text size="xs" c="dimmed" lineClamp={2}>
                  {marketGroup.description}
                </Text>
              )}
            </div>
          </Group>
        </Card.Section>
      </Card>
    );
  },
);
MarketGroupCard.displayName = "MarketGroupCard";
