"use client";

import { memo } from "react";
import {
  Group,
  Paper,
  Text,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";

import { EveEntityAvatar } from "@jitaspace/eve-components";
import { useEsiName } from "@jitaspace/hooks";

import { AllianceCard } from "./AllianceCard";
import { CharacterCard } from "./CharacterCard";
import { CorporationCard } from "./CorporationCard";

interface EveEntityCardProps {
  entityId: string | number;
}

/**
 * The card for any entity id: the alliance, corporation or character card once
 * its category is known, else its avatar and name.
 */
export const EveEntityCard = memo(({ entityId }: EveEntityCardProps) => {
  const { name, category } = useEsiName(entityId);
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const id = Number(entityId);

  if (category === "alliance") return <AllianceCard allianceId={id} />;
  if (category === "corporation") return <CorporationCard corporationId={id} />;
  if (category === "character") return <CharacterCard characterId={id} />;

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
        <EveEntityAvatar entityId={entityId} size="xl" radius="md" mx="auto" />
      </Group>
      <Text ta="center" fz="lg" fw={500} mt="md">
        {name}
      </Text>
    </Paper>
  );
});
EveEntityCard.displayName = "EveEntityCard";
