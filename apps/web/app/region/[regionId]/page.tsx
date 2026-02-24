"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
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

import { useRegion } from "@jitaspace/hooks";
import { ConstellationName, RegionName } from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";
export default function Page() {
  const params = useParams();
  const rawRegionId = params?.regionId;
  const regionId = Number(
    typeof rawRegionId === "string" ? rawRegionId : rawRegionId?.[0],
  );
  const { data: region } = useRegion(regionId);

  if (!Number.isFinite(regionId)) {
    return null;
  }

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
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
              <Group gap="xs">
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
              <Group gap="xs">
                <IconExternalLink size={14} />
                zKillboard
              </Group>
            </Button>
          </Link>
          <Link href={`https://eveeye.com/?m=${regionId}`} target="_blank">
            <Button>
              <Group gap="xs">
                <IconExternalLink size={14} />
                Eveeye
              </Group>
            </Button>
          </Link>
          <Link
            href={`https://www.adam4eve.eu/location.php?id=${regionId}`}
            target="_blank"
          >
            <Button>
              <Group gap="xs">
                <IconExternalLink size={14} />
                Adam4EVE
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
