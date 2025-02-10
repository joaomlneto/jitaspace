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
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { useCorporation, useSelectedCharacter } from "@jitaspace/hooks";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  AllianceAvatar,
  AllianceName,
  CorporationAllianceHistoryTimeline,
  CorporationAvatar,
  CorporationName,
  OpenInformationWindowActionIcon,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";
import { MainLayout } from "~/layouts";


export default function Page() {
  const router = useRouter();
  const corporationId = parseInt(router.query.corporationId as string);
  const character = useSelectedCharacter();
  const { data: corporation } = useCorporation(corporationId);

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <CorporationAvatar
            corporationId={corporationId}
            size="xl"
            radius={256}
          />
          <Title order={3}>
            <CorporationName span corporationId={corporationId} />
          </Title>
          {corporation?.data.ticker && (
            <Badge>{corporation?.data.ticker}</Badge>
          )}
          {character && (
            <OpenInformationWindowActionIcon
              characterId={character.characterId}
              entityId={corporationId}
            />
          )}
        </Group>
        <Group>
          <Link
            href={`https://evemaps.dotlan.net/corp/${corporationId}`}
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
            href={`https://evewho.com/corporation/${corporationId}`}
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
            href={`https://zkillboard.com/corporation/${corporationId}`}
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
        {corporation?.data.alliance_id && (
          <Group justify="space-between">
            <Text>Alliance</Text>
            <Group>
              <AllianceAvatar
                allianceId={corporation?.data.alliance_id}
                size="sm"
              />
              <Anchor
                component={Link}
                href={`/alliance/${corporation?.data.alliance_id}`}
              >
                <AllianceName allianceId={corporation?.data.alliance_id} />
              </Anchor>
            </Group>
          </Group>
        )}
        <Tabs defaultValue="description">
          <Tabs.List>
            <Tabs.Tab value="description">Description</Tabs.Tab>
            <Tabs.Tab value="history">Alliance History</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="description">
            {corporation?.data && (
              <MailMessageViewer
                content={
                  corporation?.data.description
                    ? sanitizeFormattedEveString(corporation?.data.description)
                    : "No description"
                }
              />
            )}
          </Tabs.Panel>
          <Tabs.Panel value="history" pt="xl">
            {
              <Container>
                <CorporationAllianceHistoryTimeline
                  corporationId={corporationId}
                />
              </Container>
            }
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return <MainLayout>{page}</MainLayout>;
};
