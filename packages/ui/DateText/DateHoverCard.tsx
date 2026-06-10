"use client";

import React, { memo, type ReactNode } from "react";
import { Group, HoverCard, type HoverCardProps, Stack, Text } from "@mantine/core";
import { format, formatDistanceToNow } from "date-fns";

type DateHoverCardProps = HoverCardProps & {
  date?: Date;
  children: ReactNode;
};

function padTwo(n: number): string {
  return String(n).padStart(2, "0");
}

function formatUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${padTwo(date.getUTCMonth() + 1)}-${padTwo(date.getUTCDate())} ${padTwo(date.getUTCHours())}:${padTwo(date.getUTCMinutes())}:${padTwo(date.getUTCSeconds())}`;
}

export const DateHoverCard = memo(
  ({ date, children, ...hoverCardProps }: DateHoverCardProps) => {
    if (!date) return <>{children}</>;

    return (
      <HoverCard
        width={240}
        shadow="md"
        withArrow
        openDelay={200}
        closeDelay={100}
        {...hoverCardProps}
      >
        <HoverCard.Target>
          <span style={{ cursor: "default" }}>{children}</span>
        </HoverCard.Target>
        <HoverCard.Dropdown>
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              {formatDistanceToNow(date, { addSuffix: true })}
            </Text>
            <Group justify="space-between" gap="xs" wrap="nowrap">
              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                Local
              </Text>
              <Text size="xs" style={{ textAlign: "right" }}>
                {format(date, "yyyy-MM-dd HH:mm:ss")}
              </Text>
            </Group>
            <Group justify="space-between" gap="xs" wrap="nowrap">
              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                EVE Time
              </Text>
              <Text size="xs" style={{ textAlign: "right" }}>
                {formatUtc(date)}
              </Text>
            </Group>
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
    );
  },
);
DateHoverCard.displayName = "DateHoverCard";
