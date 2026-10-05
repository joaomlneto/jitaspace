"use client";

import type { CSSProperties, ReactNode } from "react";
import { Box, Group, Paper, Stack, Text, Title } from "@mantine/core";

/**
 * The building blocks of the entity detail pages that share the item page's
 * layout (`/type/[typeId]`, `/faction/[factionId]`, `/alliance/[allianceId]`):
 * the hero card, a section heading, a labelled stat card, and the compact stat
 * under the hero title.
 */

/**
 * A page's hero card: framed artwork on the left, title and stats beside it.
 * `banner` runs edge to edge above the content (a corporation's palette
 * stripe); `style` and `contentClassName` let a page tint the card (its
 * palette wash).
 */
export function HeroCard({
  artwork,
  banner,
  style,
  contentClassName,
  children,
}: Readonly<{
  artwork: ReactNode;
  banner?: ReactNode;
  style?: CSSProperties;
  contentClassName?: string;
  children: ReactNode;
}>) {
  return (
    <Paper
      withBorder
      radius="md"
      p={0}
      style={{ overflow: "hidden", ...style }}
    >
      {banner}
      <Group
        align="flex-start"
        gap="xl"
        wrap="wrap"
        p="lg"
        className={contentClassName}
      >
        <Box
          style={{
            width: 170,
            height: 170,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: 8,
            border: "1px solid rgba(108, 132, 151, 0.28)",
            background:
              "radial-gradient(circle at 50% 35%, rgba(44, 66, 88, 0.4), rgba(6, 9, 15, 0.92))",
          }}
        >
          {artwork}
        </Box>
        <Stack gap="sm" style={{ flex: 1, minWidth: 240 }}>
          {children}
        </Stack>
      </Group>
    </Paper>
  );
}

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
