"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, Container, Group, Stack, Title } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { FactionAvatar, FactionName } from "@jitaspace/ui";

export default function Page() {
  const params = useParams();
  const rawFactionId = params?.factionId;
  const factionId = Number(
    typeof rawFactionId === "string" ? rawFactionId : rawFactionId?.[0],
  );
  if (!Number.isFinite(factionId)) {
    return null;
  }

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
