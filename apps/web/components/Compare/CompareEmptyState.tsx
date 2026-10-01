"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Avatar,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { TypeAvatar } from "@jitaspace/eve-components";

import type { ComparePreset } from "./presets";
import { COMPARE_PRESETS } from "./presets";

/** The URL of a comparison of `typeIds`. */
export const compareHref = (typeIds: readonly number[]) =>
  `/compare?types=${typeIds.join(",")}`;

export interface CompareEmptyStateProps {
  onPresetClick?: (preset: ComparePreset) => void;
}

/**
 * Shown while nothing is being compared: what the tool does, and a handful of
 * one-click comparisons to start from. They are real links, so they also give
 * crawlers somewhere to go from here.
 */
export const CompareEmptyState = memo(
  ({ onPresetClick }: CompareEmptyStateProps) => (
    <Stack gap="md">
      <Stack gap={4}>
        <Title order={2} size="h3">
          Start from a popular comparison
        </Title>
        <Text c="dimmed" size="sm">
          Or search for any ship, module, charge, drone or implant above. Add as
          many as you like; the first one you pick is the baseline the others
          are measured against.
        </Text>
      </Stack>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
        {COMPARE_PRESETS.map((preset) => (
          <Card
            key={preset.key}
            component={Link}
            href={compareHref(preset.typeIds)}
            onClick={() => onPresetClick?.(preset)}
            withBorder
            radius="md"
            padding="md"
          >
            <Stack gap="xs">
              <Avatar.Group spacing="sm">
                {preset.typeIds.map((typeId) => (
                  <TypeAvatar key={typeId} typeId={typeId} size={36} />
                ))}
              </Avatar.Group>
              <Group gap={6}>
                <Text fw={600}>{preset.label}</Text>
                <Text size="xs" c="dimmed">
                  {preset.typeIds.length} items
                </Text>
              </Group>
              <Text size="sm" c="dimmed">
                {preset.description}
              </Text>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  ),
);
CompareEmptyState.displayName = "CompareEmptyState";
