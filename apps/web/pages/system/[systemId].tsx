import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Anchor,
  Button,
  Container,
  Group,
  List,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { useGetUniverseSystemsSystemId } from "@jitaspace/esi-client";
import {
  AsteroidBeltName,
  ConstellationName,
  MoonName,
  PlanetAvatar,
  PlanetName,
  SolarSystemName,
  StationName,
} from "@jitaspace/ui";

import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const systemId = router.query.systemId as string;
  const { data: solarSystem } = useGetUniverseSystemsSystemId(
    parseInt(systemId),
  );

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <Title order={3}>
            <SolarSystemName span solarSystemId={systemId} />
          </Title>
        </Group>
        <Group>
          <Link
            href={`https://evemaps.dotlan.net/system/${systemId}`}
            target="_blank"
          >
            <Button>
              <Group spacing="xs">
                <IconExternalLink size={14} />
                DOTLAN EveMaps
              </Group>
            </Button>
          </Link>
          <Link
            href={`https://zkillboard.com/system/${systemId}`}
            target="_blank"
          >
            <Button>
              <Group spacing="xs">
                <IconExternalLink size={14} />
                zKillboard
              </Group>
            </Button>
          </Link>
          <Link href={`https://eveeye.com/?s=${systemId}`} target="_blank">
            <Button>
              <Group spacing="xs">
                <IconExternalLink size={14} />
                Eveeye
              </Group>
            </Button>
          </Link>
        </Group>
        {solarSystem?.data.constellation_id && (
          <Group position="apart">
            <Text>Constellation</Text>
            <Group>
              <Anchor
                component={Link}
                href={`/constellation/${solarSystem.data.constellation_id}`}
              >
                <ConstellationName
                  span
                  constellationId={solarSystem?.data.constellation_id}
                />
              </Anchor>
            </Group>
          </Group>
        )}
        Planets:
        <List>
          {solarSystem?.data.planets?.map(
            ({ planet_id, moons, asteroid_belts }) => (
              <List.Item key={planet_id}>
                <Group>
                  <PlanetAvatar planetId={planet_id} size="sm" />
                  <Anchor component={Link} href={`/planet/${planet_id}`}>
                    <PlanetName span planetId={planet_id} />
                  </Anchor>
                </Group>
                <List>
                  {moons?.map((moonId) => (
                    <List.Item key={moonId}>
                      <MoonName moonId={moonId} />
                    </List.Item>
                  ))}
                </List>
                <List>
                  {asteroid_belts?.map((asteroidBeltId) => (
                    <List.Item key={asteroidBeltId}>
                      <AsteroidBeltName span asteroidBeltId={asteroidBeltId} />
                    </List.Item>
                  ))}
                </List>
              </List.Item>
            ),
          )}
        </List>
        Stations:
        <List>
          {solarSystem?.data.stations?.map((stationId) => (
            <List.Item key={stationId}>
              <Anchor component={Link} href={`/station/${stationId}`}>
                <StationName span stationId={stationId} />
              </Anchor>
            </List.Item>
          ))}
        </List>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
