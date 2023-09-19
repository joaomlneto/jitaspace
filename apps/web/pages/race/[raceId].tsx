import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Anchor, Container, Group, Stack, Text, Title } from "@mantine/core";

import { useGetUniverseRaces } from "@jitaspace/esi-client";
import {
  FactionAvatar,
  FactionName,
  RaceAvatar,
  RaceName,
} from "@jitaspace/ui";

import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const raceId = router.query.raceId as string;
  const { data } = useGetUniverseRaces();
  const race = data?.data.find((r) => r.race_id == parseInt(raceId));
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
        <Group justify="apart">
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

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
