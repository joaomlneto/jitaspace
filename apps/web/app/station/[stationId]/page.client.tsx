"use client";

import Link from "next/link";
import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import {
  EveEntityAnchor,
  EveEntityName,
  SolarSystemAnchor,
  SolarSystemName,
  TypeAnchor,
  TypeName,
} from "@jitaspace/eve-components";
import { useSelectedCharacter, useStation } from "@jitaspace/hooks";
import { RaceAnchor } from "@jitaspace/ui";

import { SetAutopilotDestinationActionIcon } from "~/components/ActionIcon";
import { StationAvatar } from "~/components/Avatar";
import { SolarSystemSecurityStatusBadge } from "~/components/Badge";
import { RaceName } from "~/components/Text";

/**
 * The station row the server read, handed down so the page has an identity
 * before any ESI request resolves.
 */
export interface StationPageProps {
  stationId: number;
  name: string;
  solarSystemId: number | null;
  typeId: number;
  raceId: number | null;
  ownerId: number | null;
}

export default function Page(props: Readonly<StationPageProps>) {
  const { stationId } = props;
  const character = useSelectedCharacter();
  const { data: station } = useStation(stationId);

  // ESI stays the fresher source — a station can be renamed or change hands
  // between SDE ingests — but it only answers on the client. Falling back to
  // the server-read row is what puts the station's name and its outgoing links
  // in the HTML a crawler is served, the same shape the type page uses.
  const esi = station?.data;
  const name = esi?.name ?? props.name;
  const solarSystemId = esi?.system_id ?? props.solarSystemId ?? undefined;
  const typeId = esi?.type_id ?? props.typeId;
  const raceId = esi?.race_id ?? props.raceId ?? undefined;
  const ownerId = esi?.owner ?? props.ownerId ?? undefined;

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <StationAvatar stationId={stationId} size="xl" radius={256} />
          <Title order={3}>{name}</Title>
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
              solarSystemId={solarSystemId}
              size="sm"
            />
            <SolarSystemAnchor solarSystemId={solarSystemId}>
              <SolarSystemName span solarSystemId={solarSystemId} />
            </SolarSystemAnchor>
          </Group>
        </Group>
        <Group justify="space-between">
          <Text>Station Type</Text>
          <TypeAnchor typeId={typeId}>
            <TypeName span typeId={typeId} />
          </TypeAnchor>
        </Group>
        <Group justify="space-between">
          <Text>Race</Text>
          <RaceAnchor raceId={raceId}>
            <RaceName span raceId={raceId} />
          </RaceAnchor>
        </Group>
        <Group justify="space-between">
          <Text>Owner</Text>
          <EveEntityAnchor entityId={ownerId}>
            <EveEntityName entityId={ownerId} />
          </EveEntityAnchor>
        </Group>
      </Stack>
    </Container>
  );
}
