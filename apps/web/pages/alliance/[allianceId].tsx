import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button, Container, Group, Stack, Title } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { AllianceAvatar, AllianceName } from "@jitaspace/ui";

import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const allianceId = router.query.allianceId as string;

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <AllianceAvatar allianceId={allianceId} size="xl" radius={256} />
          <Title order={3}>
            <AllianceName span allianceId={allianceId} />
          </Title>
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
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
