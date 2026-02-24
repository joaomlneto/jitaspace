"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Anchor,
  Badge,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";
import { format } from "date-fns";

import {
  useEsiAllianceInformation,
  useEsiAllianceMemberCorporations,
  useSelectedCharacter,
} from "@jitaspace/hooks";
import {
  AllianceAvatar,
  AllianceName,
  CharacterAvatar,
  CharacterName,
  CorporationAvatar,
  CorporationName,
  FactionAvatar,
  FactionName,
  OpenInformationWindowActionIcon,
} from "@jitaspace/ui";

export default function Page() {
  const character = useSelectedCharacter();
  const params = useParams();
  const rawAllianceId = params?.allianceId;
  const allianceId = Number(
    typeof rawAllianceId === "string" ? rawAllianceId : rawAllianceId?.[0],
  );
  const { data: alliance } = useEsiAllianceInformation(allianceId);
  const { data: allianceCorporations } =
    useEsiAllianceMemberCorporations(allianceId);

  if (!Number.isFinite(allianceId)) {
    return null;
  }

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <AllianceAvatar allianceId={allianceId} size="xl" radius={256} />
          <Title order={3}>
            <AllianceName span allianceId={allianceId} />
          </Title>
          {alliance?.data.ticker && <Badge>{alliance?.data.ticker}</Badge>}
          {character !== null && (
            <OpenInformationWindowActionIcon
              characterId={character.characterId}
              entityId={allianceId}
            />
          )}
        </Group>
        <Group>
          <Link
            href={`https://evemaps.dotlan.net/alliance/${allianceId}`}
            target="_blank"
          >
            <Button>
              <Group gap="xs">
                <IconExternalLink size={14} />
                DOTLAN EveMaps
              </Group>
            </Button>
          </Link>
          <Link
            href={`https://evewho.com/alliance/${allianceId}`}
            target="_blank"
          >
            <Button>
              <Group gap="xs">
                <IconExternalLink size={14} />
                EveWho
              </Group>
            </Button>
          </Link>
          <Link
            href={`https://zkillboard.com/alliance/${allianceId}`}
            target="_blank"
          >
            <Button>
              <Group gap="xs">
                <IconExternalLink size={14} />
                zKillboard
              </Group>
            </Button>
          </Link>
        </Group>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text>Creator</Text>
            <Group wrap="nowrap">
              <CharacterAvatar
                characterId={alliance?.data.creator_id}
                size="sm"
              />
              <Anchor
                component={Link}
                href={`/character/${alliance?.data.creator_id}`}
              >
                <CharacterName span characterId={alliance?.data.creator_id} />
              </Anchor>
            </Group>
          </Group>
          <Group justify="space-between">
            <Text>Creator Corporation</Text>
            <Group wrap="nowrap">
              <CorporationAvatar
                corporationId={alliance?.data.creator_corporation_id}
                size="sm"
              />
              <Anchor
                component={Link}
                href={`/corporation/${alliance?.data.creator_corporation_id}`}
              >
                <CorporationName
                  span
                  corporationId={alliance?.data.creator_corporation_id}
                />
              </Anchor>
            </Group>
          </Group>
          {alliance?.data.executor_corporation_id && (
            <Group justify="space-between">
              <Text>Executor</Text>
              <Group wrap="nowrap">
                <CorporationAvatar
                  corporationId={alliance?.data.executor_corporation_id}
                  size="sm"
                />
                <Anchor
                  component={Link}
                  href={`/corporation/${alliance?.data.executor_corporation_id}`}
                >
                  <CorporationName
                    span
                    corporationId={alliance?.data.executor_corporation_id}
                  />
                </Anchor>
              </Group>
            </Group>
          )}
          {alliance?.data.date_founded && (
            <Group justify="space-between">
              <Text>Founded on</Text>
              <Text>
                {format(
                  new Date(alliance.data.date_founded),
                  "yyyy-MM-dd HH:mm",
                )}
              </Text>
            </Group>
          )}
          {alliance?.data.faction_id && (
            <Group justify="space-between">
              <Text>Factional Warfare</Text>
              <Group wrap="nowrap">
                <FactionAvatar
                  factionId={alliance?.data.faction_id}
                  size="sm"
                />
                <Anchor
                  component={Link}
                  href={`/faction/${alliance?.data.faction_id}`}
                >
                  <FactionName span factionId={alliance?.data.faction_id} />
                </Anchor>
              </Group>
            </Group>
          )}
        </Stack>
        <Title order={4}>Member Corporations</Title>
        <Stack>
          {allianceCorporations?.data.map((corporationId) => (
            <Group wrap="nowrap" key={corporationId}>
              <CorporationAvatar corporationId={corporationId} size="sm" />
              <Anchor component={Link} href={`/corporation/${corporationId}`}>
                <CorporationName span corporationId={corporationId} />
              </Anchor>
              <Group gap="xs">
                {alliance?.data.creator_corporation_id === corporationId && (
                  <Badge size="xs">Creator</Badge>
                )}
                {alliance?.data.executor_corporation_id === corporationId && (
                  <Badge size="xs">Executor</Badge>
                )}
              </Group>
            </Group>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
