"use client";

import { useParams } from "next/navigation";
import { Container, Group, Stack, Text, Title } from "@mantine/core";

import { useStar } from "@jitaspace/hooks";
import {
  SolarSystemAnchor,
  SolarSystemName,
  SolarSystemSecurityStatusBadge,
  StarAvatar,
  TypeAnchor,
  TypeName,
} from "@jitaspace/ui";

export default function Page() {
  const params = useParams();
  const rawStarId = params?.starId;
  const starId = Number(
    typeof rawStarId === "string" ? rawStarId : rawStarId?.[0],
  );
  const { data: star } = useStar(starId);

  if (!Number.isFinite(starId)) {
    return null;
  }

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <StarAvatar starId={starId} size="xl" radius={256} />
          <Title order={3}>
            <Text>{star?.data.name}</Text>
          </Title>
        </Group>
        <Group justify="space-between">
          <Text>Solar System</Text>
          <Group gap="xs">
            <SolarSystemSecurityStatusBadge
              solarSystemId={star?.data.solar_system_id}
              size="sm"
            />
            <SolarSystemAnchor solarSystemId={star?.data.solar_system_id}>
              <SolarSystemName
                span
                solarSystemId={star?.data.solar_system_id}
              />
            </SolarSystemAnchor>
          </Group>
        </Group>
        <Group justify="space-between">
          <Text>Star Type</Text>
          <TypeAnchor typeId={star?.data.type_id}>
            <TypeName span typeId={star?.data.type_id} />
          </TypeAnchor>
        </Group>
        <Group justify="space-between">
          <Text>Age</Text>
          <Text>{star?.data.age}</Text>
        </Group>
        <Group justify="space-between">
          <Text>Luminosity</Text>
          <Text>{star?.data.luminosity}</Text>
        </Group>
        <Group justify="space-between">
          <Text>Radius</Text>
          <Text>{star?.data.radius}</Text>
        </Group>
        <Group justify="space-between">
          <Text>Spectral Class</Text>
          <Text>{star?.data.spectral_class}</Text>
        </Group>
        <Group justify="space-between">
          <Text>Temperature</Text>
          <Text>{star?.data.temperature}</Text>
        </Group>
      </Stack>
    </Container>
  );
}
