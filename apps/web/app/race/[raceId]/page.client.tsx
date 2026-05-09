"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Anchor, Container, Group, Stack, Text, Title } from "@mantine/core";

import { useRace } from "@jitaspace/hooks";
import {
  FactionAvatar,
  FactionName,
  RaceAvatar,
  RaceName,
} from "@jitaspace/ui";

export default function Page() {
  const params = useParams();
  const rawRaceId = params?.raceId;
  const raceId = Number(
    typeof rawRaceId === "string" ? rawRaceId : rawRaceId?.[0],
  );

  const { data: race } = useRace(raceId);
  if (!Number.isFinite(raceId)) {
    return null;
  }
  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <RaceAvatar raceId={raceId} size="xl" radius={256} />
          <Title order={3}>
            <RaceName span raceId={raceId} />
          </Title>
        </Group>
        <Text>{race?.description}</Text>
        <Group justify="space-between">
          <Text>Faction</Text>
          <Group>
            <FactionAvatar factionId={race?.alliance_id} radius={16} />
            <Anchor component={Link} href={`/faction/${race?.alliance_id}`}>
              <FactionName span factionId={race?.alliance_id} />
            </Anchor>
          </Group>
        </Group>
      </Stack>
    </Container>
  );
}
