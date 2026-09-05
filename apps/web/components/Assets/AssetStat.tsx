"use client";

import type { ReactNode } from "react";
import { Stack, Text } from "@mantine/core";

/**
 * One labelled figure in the asset pages' summary grid.
 *
 * Shared by the character and corporation asset pages so the two headers stay
 * identical by construction rather than by two copies drifting apart.
 */
export function AssetStat({
  label,
  value,
}: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      {value}
    </Stack>
  );
}
