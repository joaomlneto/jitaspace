import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Anchor,
  Button,
  Container,
  Group,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { useGetCorporationsCorporationId } from "@jitaspace/esi-client";
import {
  AllianceAvatar,
  AllianceName,
  CorporationAllianceHistoryTimeline,
  CorporationAvatar,
  CorporationName,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";
import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const corporationId = router.query.corporationId as string;
  const { data: corporation } = useGetCorporationsCorporationId(
    parseInt(corporationId),
  );

  const sanitizeDescription = (str: string): string => {
    // FIXME: IS THIS CORRECT? THIS WILL CONSIDER THAT THE WHOLE THING IS A "UNICODE BLOCK".
    //        THIS MIGHT BREAK BADLY IF MULTIPLE BLOCKS ARE ALLOWED TO EXIST WITHIN THE STRING!
    if (str.startsWith("u'") && str.endsWith("'")) {
      str = str.slice(2, -1);
      str = str.replaceAll(/\\x[0-9a-fA-F]{2}/g, (str) => {
        const charCode = parseInt(str.slice(2), 16);
        return String.fromCharCode(charCode);
      });
      str = str.replaceAll(/\\'/g, "'");
    }
    return str;
  };

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <CorporationAvatar
            corporationId={corporationId}
            size="xl"
            radius={256}
          />
          <Title order={3}>
            <CorporationName span corporationId={corporationId} />
          </Title>
        </Group>
        <Group>
          <Link
            href={`https://evemaps.dotlan.net/corp/${corporationId}`}
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
            href={`https://evewho.com/corporation/${corporationId}`}
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
            href={`https://zkillboard.com/corporation/${corporationId}`}
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
        {corporation?.data.alliance_id && (
          <Group position="apart">
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
                    ? sanitizeDescription(corporation?.data.description)
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

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
