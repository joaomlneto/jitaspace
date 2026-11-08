"use client";

import type { CardProps } from "@mantine/core";
import type { CSSProperties, ReactNode } from "react";
import { memo } from "react";
import { Box, Card, Group, Skeleton, Stack, Text } from "@mantine/core";

import type { EntityCardVariant } from "./types";

export interface EntityCardStat {
  label: ReactNode;
  /** `null`, `undefined` or `false` once loaded reads "N/A". */
  value: ReactNode;
}

export type EntityCardProps = Omit<CardProps, "children" | "title"> & {
  variant?: EntityCardVariant;
  /** The data has not arrived yet: stat values show skeletons. */
  loading?: boolean;
  avatar: ReactNode;
  /** Usually the entity's linked name. */
  title: ReactNode;
  /** Shown beside the title, e.g. a ticker. */
  badges?: ReactNode;
  /** Lines under the title. The compact card shows them on one line. */
  subtitle?: ReactNode;
  headerRightSection?: ReactNode;
  /** Full card only: runs edge to edge above the header. */
  banner?: ReactNode;
  /** Full card only: tints the header, e.g. a corporation's palette wash. */
  headerStyle?: CSSProperties;
  /** Full card only: label/value rows under the header. */
  stats?: EntityCardStat[];
  /** Full card only: further sections, each an `EntityCardSection`. */
  children?: ReactNode;
};

/** A bordered section of a full card. */
export const EntityCardSection = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) => (
  <Card.Section p="xs" withBorder style={style}>
    {children}
  </Card.Section>
);

const StatValue = ({ value }: { value: ReactNode }) => {
  if (value === null || value === undefined || value === false)
    return <Text size="xs">N/A</Text>;
  if (typeof value === "string" || typeof value === "number")
    return (
      <Text size="xs" ta="right">
        {value}
      </Text>
    );
  return value;
};

/**
 * The frame every entity card shares: avatar, title and badges, subtitle
 * lines, label/value stats and further sections. In its `compact` variant it
 * is a single row: avatar, title and badges, and one subtitle line.
 *
 * It holds no data of its own. The per-entity cards (`AllianceCardDisplay`,
 * `WarCardDisplay`, …) fill it from plain props; their data-fetching twins in
 * `@jitaspace/eve-components` fill those.
 */
export const EntityCard = memo(
  ({
    variant = "full",
    loading = false,
    avatar,
    title,
    badges,
    subtitle,
    headerRightSection,
    banner,
    headerStyle,
    stats,
    children,
    ...cardProps
  }: EntityCardProps) => {
    if (variant === "compact") {
      return (
        <Card withBorder radius="md" p="xs" {...cardProps}>
          <Group wrap="nowrap" gap="sm">
            <Box style={{ flexShrink: 0 }}>{avatar}</Box>
            <Box miw={0} style={{ flex: 1 }}>
              <Group gap="xs" wrap="nowrap" miw={0}>
                <Box miw={0}>{title}</Box>
                {badges}
              </Group>
              {subtitle && (
                <Group gap="xs" wrap="nowrap" miw={0} c="dimmed">
                  {subtitle}
                </Group>
              )}
            </Box>
            {headerRightSection}
          </Group>
        </Card>
      );
    }

    return (
      <Card withBorder radius="md" {...cardProps}>
        {banner && <Card.Section>{banner}</Card.Section>}
        <EntityCardSection style={headerStyle}>
          <Group wrap="nowrap" justify="space-between" align="start">
            <Group wrap="nowrap" align="start" miw={0}>
              <Box style={{ flexShrink: 0 }}>{avatar}</Box>
              <Stack gap={4} miw={0}>
                <Group gap="xs" wrap="nowrap" miw={0}>
                  <Box miw={0}>{title}</Box>
                  {badges}
                </Group>
                {subtitle}
              </Stack>
            </Group>
            {headerRightSection}
          </Group>
        </EntityCardSection>

        {stats && stats.length > 0 && (
          <EntityCardSection>
            <Stack gap={6}>
              {stats.map((stat, index) => (
                <Group
                  key={index}
                  justify="space-between"
                  align="start"
                  wrap="nowrap"
                  gap="md"
                >
                  <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                    {stat.label}
                  </Text>
                  <Skeleton visible={loading} width="auto" miw={0}>
                    <StatValue value={stat.value} />
                  </Skeleton>
                </Group>
              ))}
            </Stack>
          </EntityCardSection>
        )}

        {children}
      </Card>
    );
  },
);
EntityCard.displayName = "EntityCard";
