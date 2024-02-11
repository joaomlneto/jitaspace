"use client";

import React, { memo } from "react";
import {
  Group,
  Paper,
  Text,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";

import { useEsiName } from "@jitaspace/hooks";

import { EveEntityAvatar } from "../Avatar";
import { AllianceCard } from "./AllianceCard";
import { CharacterCard } from "./CharacterCard";
import { CorporationCard } from "./CorporationCard";


interface EveEntityCardProps {
  entityId: string | number;
}

export const EveEntityCard = memo(({ entityId }: EveEntityCardProps) => {
  const { name, category } = useEsiName(entityId);
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  if (category === "alliance") return <AllianceCard allianceId={entityId} />;
  if (category === "character")
    return <CharacterCard characterId={Number(entityId)} />;
  if (category === "corporation")
    return <CorporationCard corporationId={entityId} />;

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
        <EveEntityAvatar entityId={entityId} size="xl" radius={120} mx="auto" />
      </Group>
      <Text ta="center" fz="lg" fw={500} mt="md">
        {name}
      </Text>
    </Paper>
  );
});
EveEntityCard.displayName = "EveEntityCard";
