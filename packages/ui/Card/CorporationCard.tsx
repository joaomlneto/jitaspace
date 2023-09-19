import React, { memo } from "react";
import Link from "next/link";
import { Anchor, Group, Paper } from "@mantine/core";

import { CorporationAvatar } from "../Avatar";
import { CorporationName } from "../Text";

interface CorporationCardProps {
  corporationId: string | number;
}

export const CorporationCard = memo(
  ({ corporationId }: CorporationCardProps) => {
    return (
      <Paper
        radius="md"
        withBorder
        p="lg"
        sx={(theme) => ({
          backgroundColor:
            theme.colorScheme === "dark" ? theme.colors.dark[8] : theme.white,
        })}
      >
        <Group>
          <CorporationAvatar
            corporationId={corporationId}
            size="xl"
            radius={120}
            mx="auto"
          />
        </Group>
        <CorporationName
          corporationId={corporationId}
          ta="center"
          fz="lg"
          weight={500}
          mt="md"
        />
        <Anchor
          component={Link}
          href={`https://evewho.com/corporation/${corporationId}`}
          target="_blank"
          size="sm"
        >
          <Group gap="xs">
            <Anchor>Open in EVE Who</Anchor>
          </Group>
        </Anchor>
      </Paper>
    );
  },
);
CorporationCard.displayName = "CorporationCard";
