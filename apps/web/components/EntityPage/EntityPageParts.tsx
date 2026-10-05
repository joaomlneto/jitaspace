"use client";

import type { ReactNode } from "react";
import { Box, Group, Paper, Stack, Text, Title } from "@mantine/core";

/**
 * The building blocks of the entity detail pages that share the item page's
 * layout (`/type/[typeId]`, `/faction/[factionId]`): a section heading, a
 * labelled stat card, and the compact stat under the hero title.
 */

export function SectionHeading({
  icon,
  children,
}: Readonly<{
  icon: ReactNode;
  children: ReactNode;
}>) {
  return (
    <Group gap={8} align="center">
      <Box c="eve_accent.4" style={{ display: "flex" }}>
        {icon}
      </Box>
      <Title order={4}>{children}</Title>
    </Group>
  );
}

export function StatCard({
  label,
  value,
  sub,
}: Readonly<{
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}>) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap={2}>
        <Text
          size="xs"
          c="dimmed"
          tt="uppercase"
          fw={700}
          style={{ letterSpacing: "0.05em" }}
        >
          {label}
        </Text>
        <Text component="div" fw={600} c="bright">
          {value}
        </Text>
        {sub !== undefined && (
          <Text component="div" size="xs" c="dimmed">
            {sub}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

export function HeroStat({
  label,
  value,
}: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <Stack gap={0}>
      <Text
        size="xs"
        c="dimmed"
        tt="uppercase"
        style={{ letterSpacing: "0.05em" }}
      >
        {label}
      </Text>
      <Text component="div" fw={600} c="bright">
        {value}
      </Text>
    </Stack>
  );
}
