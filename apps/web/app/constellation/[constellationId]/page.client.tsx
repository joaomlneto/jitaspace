"use client";

import Link from "next/link";
import {
  Anchor,
  Container,
  Group,
  List,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { RegionName, SolarSystemName } from "@jitaspace/eve-components";
import { useConstellation } from "@jitaspace/hooks";

import { SolarSystemSecurityStatusBadge } from "~/components/Badge";

/**
 * The name and the parent region arrive as props: they are read on the server
 * so they are in the HTML a crawler sees. Fetching them client-side left
 * `/constellation/20000020` server-rendering ~40 words with nothing
 * constellation-specific in them. The solar system list still comes from ESI.
 */
export default function Page({
  constellationId,
  name,
  regionId,
  regionName,
}: Readonly<{
  constellationId: number;
  name: string;
  regionId: number;
  regionName: string | null;
}>) {
  const { data: constellation } = useConstellation(constellationId);

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <Title order={3}>{name}</Title>
        </Group>
        <Group justify="space-between">
          <Text>Region</Text>
          <Group>
            <Anchor component={Link} href={`/region/${regionId}`}>
              {/* The relation is optional, so fall back to resolving the name
                  client-side if the region row is missing. */}
              {regionName ?? <RegionName span regionId={regionId} />}
            </Anchor>
          </Group>
        </Group>
        Solar Systems:
        <List>
          {constellation?.data.systems.map((systemId: number) => (
            <List.Item key={systemId}>
              <Group gap="xs">
                <SolarSystemSecurityStatusBadge
                  solarSystemId={systemId}
                  size="sm"
                />
                <Anchor component={Link} href={`/system/${systemId}`}>
                  <SolarSystemName span solarSystemId={systemId} />
                </Anchor>
              </Group>
            </List.Item>
          ))}
        </List>
      </Stack>
    </Container>
  );
}
