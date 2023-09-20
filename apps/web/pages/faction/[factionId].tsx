import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button, Container, Group, Stack, Title } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { FactionAvatar, FactionName } from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const factionId = router.query.factionId as string;

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <FactionAvatar factionId={factionId} size="xl" radius={256} />
          <Title order={3}>
            <FactionName span factionId={factionId} />
          </Title>
        </Group>
        <Group>
          <Link
            href={`https://zkillboard.com/faction/${factionId}`}
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
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
