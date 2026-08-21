"use client";

import { useParams } from "next/navigation";
import { Container, Group, Stack, Text, Title } from "@mantine/core";

import {
  SolarSystemAnchor,
  SolarSystemName,
  TypeAnchor,
  TypeName,
} from "@jitaspace/eve-components";
import { usePlanet } from "@jitaspace/hooks";
import { Position3DText, TypeAvatar } from "@jitaspace/ui";

import { SolarSystemSecurityStatusBadge } from "~/components/Badge";

export default function Page() {
  const params = useParams();
  const rawPlanetId = params.planetId;
  const planetId = Number(
    typeof rawPlanetId === "string" ? rawPlanetId : rawPlanetId?.[0],
  );
  const { data: planet } = usePlanet(planetId);

  if (!Number.isFinite(planetId)) {
    return null;
  }

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <TypeAvatar typeId={planet?.data.type_id} size="xl" radius={256} />
          <Title order={3}>
            <Text>{planet?.data.name}</Text>
          </Title>
        </Group>
        <Group justify="space-between">
          <Text>Solar System</Text>
          <Group gap="xs">
            <SolarSystemSecurityStatusBadge
              solarSystemId={planet?.data.system_id}
              size="sm"
            />
            <SolarSystemAnchor solarSystemId={planet?.data.system_id}>
              <SolarSystemName span solarSystemId={planet?.data.system_id} />
            </SolarSystemAnchor>
          </Group>
        </Group>
        <Group justify="space-between">
          <Text>Planet Type</Text>
          <TypeAnchor typeId={planet?.data.type_id}>
            <TypeName span typeId={planet?.data.type_id} />
          </TypeAnchor>
        </Group>
        <Group justify="space-between">
          <Text>Position</Text>
          <Position3DText
            size="xs"
            position={
              planet?.data.position
                ? Object.values(planet.data.position)
                : undefined
            }
          />
        </Group>
      </Stack>
    </Container>
  );
}
