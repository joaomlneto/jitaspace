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

import {
  useGetUniverseSystemsSystemId,
  useSolarSystemCostIndices,
} from "@jitaspace/esi-client";
import { IndustryIcon } from "@jitaspace/eve-icons";
import {
  AsteroidBeltName,
  ConstellationName,
  MoonName,
  PlanetAvatar,
  PlanetName,
  SetAutopilotDestinationActionIcon,
  SolarSystemName,
  SolarSystemSecurityStatusBadge,
  StationAvatar,
  StationName,
} from "@jitaspace/ui";

import { StatsGrid } from "~/components/UI";
import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const systemId = router.query.systemId as string;
  const { data: solarSystem } = useGetUniverseSystemsSystemId(
    parseInt(systemId),
  );
  const { data: solarSystemCostIndicesData } = useSolarSystemCostIndices();

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <Title order={3}>
            <Group>
              <SolarSystemName span solarSystemId={systemId} />
              <SolarSystemSecurityStatusBadge solarSystemId={systemId} />
              <SetAutopilotDestinationActionIcon destinationId={systemId} />
            </Group>
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
        <Title order={4}>Celestials</Title>
        <Stack spacing="xs">
          {solarSystem?.data.planets?.map(
            ({ planet_id, moons, asteroid_belts }) => (
              <Stack spacing="xs" key={planet_id}>
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
              </Stack>
            ),
          )}
        </Stack>
        <Title order={4}>Stations</Title>
        <Stack spacing="xs">
          {solarSystem?.data.stations?.map((stationId) => (
            <Group key={stationId} spacing="xs">
              <StationAvatar size="sm" stationId={stationId} />
              <Anchor component={Link} href={`/station/${stationId}`}>
                <StationName span stationId={stationId} />
              </Anchor>
            </Group>
          ))}
        </Stack>
        {Object.hasOwn(solarSystemCostIndicesData, systemId) && (
          <>
            <Title order={4}>Industry Cost Indices</Title>
            <StatsGrid
              cols={3}
              spacing="xs"
              breakpoints={[
                { maxWidth: "sm", cols: 2 },
                { maxWidth: "xs", cols: 1 },
              ]}
              data={(
                solarSystemCostIndicesData[systemId]?.cost_indices ?? []
              ).map((index) => ({
                icon: (props) => <IndustryIcon {...props} />,
                title: index.activity.replaceAll("_", " "),
                value: index.cost_index.toString(),
              }))}
            />
          </>
        )}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
