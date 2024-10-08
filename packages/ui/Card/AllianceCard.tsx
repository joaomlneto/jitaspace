"use client";

import React, { memo } from "react";
import Link from "next/link";
import {
  Anchor,
  Group,
  Paper,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { AllianceAvatar } from "../Avatar";
import { AllianceName } from "../Text";


interface AllianceCardProps {
  allianceId: string | number;
}

export const AllianceCard = memo(({ allianceId }: AllianceCardProps) => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  return (
    <Paper
      radius="md"
      withBorder
      p="lg"
      style={{
        backgroundColor:
          colorScheme === "dark" ? theme.colors.dark[8] : theme.white,
      }}
    >
      <Group>
        <AllianceAvatar
          allianceId={allianceId}
          size="xl"
          radius={120}
          mx="auto"
        />
      </Group>
      <AllianceName
        allianceId={allianceId}
        ta="center"
        fz="lg"
        fw={500}
        mt="md"
      />
      <Anchor
        component={Link}
        href={`https://evewho.com/alliance/${allianceId}`}
        target="_blank"
        size="sm"
      >
        <Group gap="xs">
          <IconExternalLink size={14} />
          <Anchor>Open in EVE Who</Anchor>
        </Group>
      </Anchor>
    </Paper>
  );
});
AllianceCard.displayName = "AllianceCard";
