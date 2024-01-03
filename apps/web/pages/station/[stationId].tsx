import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Anchor,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { useSelectedCharacter, useStation } from "@jitaspace/hooks";
import {
  EveEntityAnchor,
  EveEntityName,
  RaceName,
  SetAutopilotDestinationActionIcon,
  SolarSystemName,
  SolarSystemSecurityStatusBadge,
  StationAvatar,
  StationName,
  TypeName,
} from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const stationId = parseInt(router.query.stationId as string);
  const character = useSelectedCharacter();
  const { data: station } = useStation(stationId);

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <StationAvatar stationId={stationId} size="xl" radius={256} />
          <Title order={3}>
            <StationName span stationId={stationId} />
          </Title>
          {character && (
            <SetAutopilotDestinationActionIcon
              characterId={character.characterId}
              destinationId={stationId}
            />
          )}
        </Group>
        <Group>
          <Link
            href={`https://evemaps.dotlan.net/station/${stationId}`}
            target="_blank"
          >
            <Button>
              <Group gap="xs">
                <IconExternalLink size={14} />
                DOTLAN EveMaps
              </Group>
            </Button>
          </Link>
        </Group>
        <Group justify="space-between">
          <Text>Solar System</Text>
          <Group gap="xs">
            <SolarSystemSecurityStatusBadge
              solarSystemId={station?.data.system_id}
              size="sm"
            />
            <Anchor
              component={Link}
              href={`/system/${station?.data.system_id}`}
            >
              <SolarSystemName span solarSystemId={station?.data.system_id} />
            </Anchor>
          </Group>
        </Group>
        <Group justify="space-between">
          <Text>Station Type</Text>
          <Anchor component={Link} href={`/type/${station?.data.type_id}`}>
            <TypeName span typeId={station?.data.type_id} />
          </Anchor>
        </Group>
        <Group justify="space-between">
          <Text>Race</Text>
          <Anchor component={Link} href={`/race/${station?.data.race_id}`}>
            <RaceName span raceId={station?.data.race_id} />
          </Anchor>
        </Group>
        <Group justify="space-between">
          <Text>Owner</Text>
          <EveEntityAnchor entityId={station?.data.owner}>
            <EveEntityName entityId={station?.data.owner} />
          </EveEntityAnchor>
        </Group>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
