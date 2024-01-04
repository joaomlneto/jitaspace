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

import { CharacterAvatar } from "../Avatar";
import { CharacterName } from "../Text";


interface CharacterCardProps {
  characterId: string | number;
}

export const CharacterCard = memo(({ characterId }: CharacterCardProps) => {
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
        fw={500}
        mt="md"
      />
      <Anchor
        component={Link}
        href={`https://evewho.com/character/${characterId}`}
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
CharacterCard.displayName = "CharacterCard";
