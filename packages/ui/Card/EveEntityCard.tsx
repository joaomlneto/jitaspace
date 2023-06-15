import React, { memo } from "react";
import { Group, Paper, Text } from "@mantine/core";

import { EveEntityAvatar } from "../Avatar";
import { useEsiName } from "../hooks";
import { AllianceCard } from "./AllianceCard";
import { CharacterCard } from "./CharacterCard";
import { CorporationCard } from "./CorporationCard";

interface EveEntityCardProps {
  entityId: string | number;
}

export const EveEntityCard = memo(({ entityId }: EveEntityCardProps) => {
  const { name, category } = useEsiName(entityId);

  if (category === "alliance") return <AllianceCard allianceId={entityId} />;
  if (category === "character") return <CharacterCard characterId={entityId} />;
  if (category === "corporation")
    return <CorporationCard corporationId={entityId} />;

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
        <EveEntityAvatar entityId={entityId} size="xl" radius={120} mx="auto" />
      </Group>
      <Text ta="center" fz="lg" weight={500} mt="md">
        {name}
      </Text>
    </Paper>
  );
});
EveEntityCard.displayName = "EveEntityCard";
