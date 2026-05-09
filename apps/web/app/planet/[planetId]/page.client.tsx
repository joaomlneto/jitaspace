"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Anchor, Container, Group, Stack, Text, Title } from "@mantine/core";

import { usePlanet } from "@jitaspace/hooks";
import {
  Position3DText,
  SolarSystemName,
  SolarSystemSecurityStatusBadge,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";

export default function Page() {
  const params = useParams();
  const rawPlanetId = params?.planetId;
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
            <Anchor component={Link} href={`/system/${planet?.data.system_id}`}>
              <SolarSystemName span solarSystemId={planet?.data.system_id} />
            </Anchor>
          </Group>
        </Group>
        <Group justify="space-between">
          <Text>Planet Type</Text>
          <Anchor component={Link} href={`/type/${planet?.data.type_id}`}>
            <TypeName span typeId={planet?.data.type_id} />
          </Anchor>
        </Group>
        <Group justify="space-between">
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
