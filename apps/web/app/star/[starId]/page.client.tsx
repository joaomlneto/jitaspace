"use client";

import { useParams } from "next/navigation";
import { Container, Group, Stack, Text, Title } from "@mantine/core";

import { SolarSystemName, TypeName } from "@jitaspace/eve-components";
import { useStar } from "@jitaspace/hooks";

import { SolarSystemAnchor, TypeAnchor } from "~/components/Anchor";
import { StarAvatar } from "~/components/Avatar";
import { SolarSystemSecurityStatusBadge } from "~/components/Badge";

/** The SDE gives a star's age in seconds; EVE shows it in (Julian) years. */
const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60;

export default function Page() {
  const params = useParams();
  const rawStarId = params.starId;
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
            <Text>{star?.name}</Text>
          </Title>
        </Group>
        <Group justify="space-between">
          <Text>Solar System</Text>
          <Group gap="xs">
            <SolarSystemSecurityStatusBadge
              solarSystemId={star?.solarSystemID}
              size="sm"
            />
            <SolarSystemAnchor solarSystemId={star?.solarSystemID}>
              <SolarSystemName span solarSystemId={star?.solarSystemID} />
            </SolarSystemAnchor>
          </Group>
        </Group>
        <Group justify="space-between">
          <Text>Star Type</Text>
          <TypeAnchor typeId={star?.typeID}>
            <TypeName span typeId={star?.typeID} />
          </TypeAnchor>
        </Group>
        <Group justify="space-between">
          <Text>Age</Text>
          <Text>
            {star?.statistics?.age === undefined
              ? undefined
              : Math.round(star.statistics.age / SECONDS_PER_YEAR)}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text>Luminosity</Text>
          <Text>{star?.statistics?.luminosity}</Text>
        </Group>
        <Group justify="space-between">
          <Text>Radius</Text>
          <Text>{star?.radius}</Text>
        </Group>
        <Group justify="space-between">
          <Text>Spectral Class</Text>
          <Text>{star?.statistics?.spectralClass}</Text>
        </Group>
        <Group justify="space-between">
          <Text>Temperature</Text>
          <Text>{star?.statistics?.temperature}</Text>
        </Group>
      </Stack>
    </Container>
  );
}
