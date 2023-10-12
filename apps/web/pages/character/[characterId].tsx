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

import { useGetCharactersCharacterId } from "@jitaspace/esi-client-kubb";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  AllianceAvatar,
  AllianceName,
  BloodlineName,
  CharacterAvatar,
  CharacterName,
  CorporationAvatar,
  CorporationName,
  FormattedDateText,
  OpenInformationWindowActionIcon,
  RaceName,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";
import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const characterId = router.query.characterId as string;
  const { data: character } = useGetCharactersCharacterId(
    parseInt(characterId),
  );

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <CharacterAvatar characterId={characterId} size="xl" radius={256} />
          <Title order={3}>
            <CharacterName span characterId={characterId} />
          </Title>
          <OpenInformationWindowActionIcon entityId={characterId} />
        </Group>
        <Group>
          <Link
            href={`https://evewho.com/character/${characterId}`}
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
            href={`https://zkillboard.com/character/${characterId}`}
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
        {character?.data.corporation_id && (
          <Group position="apart">
            <Text>Corporation</Text>
            <Group>
              <CorporationAvatar
                corporationId={character?.data.corporation_id}
                size="sm"
              />
              <Anchor
                component={Link}
                href={`/corporation/${character?.data.corporation_id}`}
              >
                <CorporationName
                  span
                  corporationId={character?.data.corporation_id}
                />
              </Anchor>
            </Group>
          </Group>
        )}
        {character?.data.alliance_id && (
          <Group position="apart">
            <Text>Alliance</Text>
            <Group>
              <AllianceAvatar
                allianceId={character?.data.alliance_id}
                size="sm"
              />
              <Anchor
                component={Link}
                href={`/alliance/${character?.data.alliance_id}`}
              >
                <AllianceName span allianceId={character?.data.alliance_id} />
              </Anchor>
            </Group>
          </Group>
        )}
        {character?.data.gender && (
          <Group position="apart">
            <Text>Gender</Text>
            <Text>{character?.data.gender === "male" ? "Male" : "Female"}</Text>
          </Group>
        )}
        {character?.data.security_status !== undefined && (
          <Group position="apart">
            <Text>Security Status</Text>
            <Text>{character?.data.security_status}</Text>
          </Group>
        )}
        {character?.data.birthday && (
          <Group position="apart">
            <Text>Birthday</Text>
            <Text>
              <FormattedDateText date={new Date(character.data.birthday)} />
            </Text>
          </Group>
        )}
        <Group position="apart">
          <Text>Bloodline</Text>
          <Anchor
            component={Link}
            href={`/bloodline/${character?.data.bloodline_id}`}
          >
            <BloodlineName bloodlineId={character?.data.bloodline_id} />
          </Anchor>
        </Group>
        <Group position="apart">
          <Text>Race</Text>
          <Anchor component={Link} href={`/race/${character?.data.race_id}`}>
            <RaceName span raceId={character?.data.race_id} />
          </Anchor>
        </Group>
        {character?.data && (
          <MailMessageViewer
            content={
              character?.data.description
                ? sanitizeFormattedEveString(character?.data.description)
                : "No description"
            }
          />
        )}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
