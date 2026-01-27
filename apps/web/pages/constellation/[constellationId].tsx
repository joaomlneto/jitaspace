import type { ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Anchor,
  Container,
  Group,
  List,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { useConstellation } from "@jitaspace/hooks";
import {
  ConstellationName,
  RegionName,
  SolarSystemName,
  SolarSystemSecurityStatusBadge,
} from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const constellationId = parseInt(router.query.constellationId as string);
  const { data: constellation } = useConstellation(constellationId);

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <Title order={3}>
            <ConstellationName span constellationId={constellationId} />
          </Title>
        </Group>
        {constellation?.data.region_id && (
          <Group justify="space-between">
            <Text>Region</Text>
            <Group>
              <Anchor
                component={Link}
                href={`/region/${constellation.data.region_id}`}
              >
                <RegionName span regionId={constellation?.data.region_id} />
              </Anchor>
            </Group>
          </Group>
        )}
        Solar Systems:
        <List>
          {constellation?.data.systems.map((systemId) => (
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

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
