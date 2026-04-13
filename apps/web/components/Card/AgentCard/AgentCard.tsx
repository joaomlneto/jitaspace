"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Card, Group, Text } from "@mantine/core";

import { useSdeAgent } from "@jitaspace/hooks";
import {
  CharacterAvatar,
  CharacterName,
  CorporationName,
  SolarSystemName,
} from "@jitaspace/ui";

import classes from "./AgentCard.module.css";

export type AgentCardProps = Omit<CardProps, "children"> & {
  agentId: number;
};

export const AgentCard = memo(({ agentId, ...otherProps }: AgentCardProps) => {
  const { data: agent } = useSdeAgent(agentId);

  return (
    <Card withBorder radius="md" className={classes.card} {...otherProps}>
      <Card.Section className={classes.imageSection}>
        <Group wrap="nowrap" align="start">
          <CharacterAvatar characterId={agentId} size={64} radius="md" />
          <div style={{ flex: 1 }}>
            <CharacterName
              characterId={agentId}
              fz="lg"
              fw={500}
              className={classes.headerName}
            />
            {agent?.data.corporationID && (
              <CorporationName
                corporationId={agent.data.corporationID}
                size="xs"
                c="dimmed"
              />
            )}
            {agent?.data.locationID && (
              <SolarSystemName
                solarSystemId={agent.data.locationID}
                size="xs"
                c="dimmed"
              />
            )}
            {agent?.data.level && (
              <Text size="xs" c="dimmed">
                Level {agent.data.level}
              </Text>
            )}
          </div>
        </Group>
      </Card.Section>
    </Card>
  );
});
AgentCard.displayName = "AgentCard";
