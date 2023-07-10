import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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
  useGetAlliancesAllianceId,
  useGetAlliancesAllianceIdCorporations,
} from "@jitaspace/esi-client";
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

import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const allianceId = router.query.allianceId as string;
  const { data: alliance } = useGetAlliancesAllianceId(parseInt(allianceId));
  const { data: allianceCorporations } = useGetAlliancesAllianceIdCorporations(
    parseInt(allianceId),
  );

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <AllianceAvatar allianceId={allianceId} size="xl" radius={256} />
          <Title order={3}>
            <AllianceName span allianceId={allianceId} />
          </Title>
          {alliance?.data.ticker && <Badge>{alliance?.data.ticker}</Badge>}
          <OpenInformationWindowActionIcon entityId={allianceId} />
        </Group>
        <Group>
          <Link
            href={`https://evemaps.dotlan.net/alliance/${allianceId}`}
            target="_blank"
          >
            <Button>
              <Group spacing="xs">
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
              <Group spacing="xs">
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
              <Group spacing="xs">
                <IconExternalLink size={14} />
                zKillboard
              </Group>
            </Button>
          </Link>
        </Group>
        <Stack spacing="xs">
          <Group position="apart">
            <Text>Creator</Text>
            <Group noWrap>
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
          <Group position="apart">
            <Text>Creator Corporation</Text>
            <Group noWrap>
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
          <Group position="apart">
            <Text>Executor</Text>
            <Group noWrap>
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
          {alliance?.data.date_founded && (
            <Group position="apart">
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
            <Group position="apart">
              <Text>Factional Warfare</Text>
              <Group noWrap>
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
            <Group noWrap key={corporationId}>
              <CorporationAvatar corporationId={corporationId} size="sm" />
              <Anchor component={Link} href={`/corporation/${corporationId}`}>
                <CorporationName span corporationId={corporationId} />
              </Anchor>
              <Group spacing="xs">
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

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
