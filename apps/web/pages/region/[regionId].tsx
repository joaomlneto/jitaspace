import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Anchor,
  Button,
  Container,
  Group,
  List,
  Stack,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { useGetUniverseRegionsRegionId } from "@jitaspace/esi-client";
import { ConstellationName, RegionName } from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";
import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const regionId = router.query.regionId as string;
  const { data: region } = useGetUniverseRegionsRegionId(parseInt(regionId));

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <Title order={3}>
            <RegionName span regionId={regionId} />
          </Title>
        </Group>
        <Group>
          <Link
            href={`https://evemaps.dotlan.net/region/${regionId}`}
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
            href={`https://zkillboard.com/region/${regionId}`}
            target="_blank"
          >
            <Button>
              <Group spacing="xs">
                <IconExternalLink size={14} />
                zKillboard
              </Group>
            </Button>
          </Link>
          <Link href={`https://eveeye.com/?m=${regionId}`} target="_blank">
            <Button>
              <Group spacing="xs">
                <IconExternalLink size={14} />
                Eveeye
              </Group>
            </Button>
          </Link>
        </Group>
        {region?.data.description && (
          <MailMessageViewer content={region?.data.description} />
        )}
        <Title order={4}>Constellations:</Title>
        <List>
          {region?.data.constellations.map((constellationId) => (
            <List.Item key={constellationId}>
              <Anchor
                component={Link}
                href={`/constellation/${constellationId}`}
              >
                <ConstellationName span constellationId={constellationId} />
              </Anchor>
            </List.Item>
          ))}
        </List>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};