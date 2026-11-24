"use client";

import { Container, Group, Stack, Text, Title } from "@mantine/core";

import {
  SolarSystemName,
  TypeAvatar,
  TypeName,
} from "@jitaspace/eve-components";
import { usePlanet } from "@jitaspace/hooks";
import { Position3DText } from "@jitaspace/ui";

import { SolarSystemAnchor, TypeAnchor } from "~/components/Anchor";
import { SolarSystemSecurityStatusBadge } from "~/components/Badge";

export default function Page({ planetId }: Readonly<{ planetId: number }>) {
  const { data: planet } = usePlanet(planetId);

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <TypeAvatar typeId={planet?.typeID} size="xl" radius={256} />
          <Title order={3}>
            <Text>{planet?.name}</Text>
          </Title>
        </Group>
        <Group justify="space-between">
          <Text>Solar System</Text>
          <Group gap="xs">
            <SolarSystemSecurityStatusBadge
              solarSystemId={planet?.solarSystemID}
              size="sm"
            />
            <SolarSystemAnchor solarSystemId={planet?.solarSystemID}>
              <SolarSystemName span solarSystemId={planet?.solarSystemID} />
            </SolarSystemAnchor>
          </Group>
        </Group>
        <Group justify="space-between">
          <Text>Planet Type</Text>
          <TypeAnchor typeId={planet?.typeID}>
            <TypeName span typeId={planet?.typeID} />
          </TypeAnchor>
        </Group>
        <Group justify="space-between">
          <Text>Position</Text>
          <Position3DText
            size="xs"
            position={
              planet?.position ? Object.values(planet.position) : undefined
            }
          />
        </Group>
      </Stack>
    </Container>
  );
}
