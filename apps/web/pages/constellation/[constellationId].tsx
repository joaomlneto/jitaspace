import React, { type ReactElement } from "react";
import { useRouter } from "next/router";
import { Container, Group, Stack, Text, Title } from "@mantine/core";

import { useGetUniverseConstellationsConstellationId } from "@jitaspace/esi-client";
import { ConstellationName, RegionName, SolarSystemName } from "@jitaspace/ui";

import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const constellationId = router.query.constellationId as string;
  const { data: constellation } = useGetUniverseConstellationsConstellationId(
    parseInt(constellationId),
  );

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <Title order={3}>
            <ConstellationName span constellationId={constellationId} />
          </Title>
        </Group>
        {constellation?.data.region_id && (
          <Group position="apart">
            <Text>Region</Text>
            <Group>
              <RegionName regionId={constellation?.data.region_id} />
            </Group>
          </Group>
        )}
        Solar Systems:
        <ul>
          {constellation?.data.systems.map((systemId) => (
            <li key={systemId}>
              <SolarSystemName solarSystemId={systemId} />
            </li>
          ))}
        </ul>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
