import React, { type ReactElement } from "react";
import { useRouter } from "next/router";
import { Container, Group, Stack, Text, Title } from "@mantine/core";

import { useGetUniverseStarsStarId } from "@jitaspace/esi-client-kubb";
import {
  SolarSystemAnchor,
  SolarSystemName,
  SolarSystemSecurityStatusBadge,
  StarAvatar,
  TypeAnchor,
  TypeName,
} from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const starId = router.query.starId as string;
  const { data: star } = useGetUniverseStarsStarId(parseInt(starId));

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <StarAvatar starId={starId} size="xl" radius={256} />
          <Title order={3}>
            <Text>{star?.data.name}</Text>
          </Title>
        </Group>
        <Group position="apart">
          <Text>Solar System</Text>
          <Group spacing="xs">
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
        <Group position="apart">
          <Text>Star Type</Text>
          <TypeAnchor typeId={star?.data.type_id}>
            <TypeName span typeId={star?.data.type_id} />
          </TypeAnchor>
        </Group>
        <Group position="apart">
          <Text>Age</Text>
          <Text>{star?.data.age}</Text>
        </Group>
        <Group position="apart">
          <Text>Luminosity</Text>
          <Text>{star?.data.luminosity}</Text>
        </Group>
        <Group position="apart">
          <Text>Radius</Text>
          <Text>{star?.data.radius}</Text>
        </Group>
        <Group position="apart">
          <Text>Spectral Class</Text>
          <Text>{star?.data.spectral_class}</Text>
        </Group>
        <Group position="apart">
          <Text>Temperature</Text>
          <Text>{star?.data.temperature}</Text>
        </Group>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
