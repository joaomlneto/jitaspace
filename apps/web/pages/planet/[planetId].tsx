import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Anchor, Container, Group, Stack, Text, Title } from "@mantine/core";

import { useGetUniversePlanetsPlanetId } from "@jitaspace/esi-client";
import {
  Position3DText,
  SolarSystemName,
  SolarSystemSecurityStatusBadge,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const planetId = router.query.planetId as string;
  const { data: planet } = useGetUniversePlanetsPlanetId(parseInt(planetId));

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <TypeAvatar typeId={planet?.data.type_id} size="xl" radius={256} />
          <Title order={3}>
            <Text>{planet?.data.name}</Text>
          </Title>
        </Group>
        <Group position="apart">
          <Text>Solar System</Text>
          <Group spacing="xs">
            <SolarSystemSecurityStatusBadge
              solarSystemId={planet?.data.system_id}
              size="sm"
            />
            <Anchor component={Link} href={`/system/${planet?.data.system_id}`}>
              <SolarSystemName span solarSystemId={planet?.data.system_id} />
            </Anchor>
          </Group>
        </Group>
        <Group position="apart">
          <Text>Planet Type</Text>
          <Anchor component={Link} href={`/type/${planet?.data.type_id}`}>
            <TypeName span typeId={planet?.data.type_id} />
          </Anchor>
        </Group>
        <Group position="apart">
          <Text>Position</Text>
          <Position3DText
            size="xs"
            position={
              (planet?.data.position
                ? Object.values(planet?.data.position)
                : undefined) as [number, number, number] | undefined
            }
          />
        </Group>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
