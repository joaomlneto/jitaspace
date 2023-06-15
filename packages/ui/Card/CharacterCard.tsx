import React from "react";
import Link from "next/link";
import { Anchor, Group, Paper } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { CharacterAvatar } from "../Avatar";
import { CharacterName } from "../Text";

interface CharacterCardProps {
  characterId: string | number;
}

export function CharacterCard({ characterId }: CharacterCardProps) {
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
        <CharacterAvatar
          characterId={characterId}
          size="xl"
          radius={120}
          mx="auto"
        />
      </Group>
      <CharacterName
        characterId={characterId}
        ta="center"
        fz="lg"
        weight={500}
        mt="md"
      />
      <Anchor
        component={Link}
        href={`https://evewho.com/character/${characterId}`}
        target="_blank"
        size="sm"
      >
        <Group spacing="xs">
          <IconExternalLink size={14} />
          <Anchor span>Open in EVE Who</Anchor>
        </Group>
      </Anchor>
    </Paper>
  );
}
