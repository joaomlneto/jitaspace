import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Anchor,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { IndustryIcon } from "@jitaspace/eve-icons";
import {
  useSelectedCharacter,
  useSolarSystem,
  useSolarSystemCostIndices,
} from "@jitaspace/hooks";
import { useGetSolarSystemById } from "@jitaspace/sde-client";
import {
  AsteroidBeltName,
  MoonName,
  PlanetAvatar,
  PlanetName,
  Position3DText,
  SetAutopilotDestinationActionIcon,
  SolarSystemBreadcrumbs,
  SolarSystemName,
  SolarSystemSecurityStatusBadge,
  StarAnchor,
  StarAvatar,
  StargateAvatar,
  StargateDestinationAnchor,
  StargateName,
  StarName,
  StationAnchor,
  StationAvatar,
  StationName,
  TypeAvatar,
} from "@jitaspace/ui";

import { StatsGrid } from "~/components/UI";
import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const systemId = parseInt(router.query.systemId as string);
  const character = useSelectedCharacter();
  const { data: solarSystem } = useSolarSystem(systemId);
  const { data: sdeSolarSystem } = useGetSolarSystemById(systemId);
  const { data: solarSystemCostIndicesData } = useSolarSystemCostIndices();

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <Title order={3}>
            <Group>
              <SolarSystemName span solarSystemId={systemId} />
              <SolarSystemSecurityStatusBadge solarSystemId={systemId} />
              {character && (
                <SetAutopilotDestinationActionIcon
                  characterId={character.characterId}
                  destinationId={systemId}
                />
              )}
            </Group>
          </Title>
        </Group>
        <SolarSystemBreadcrumbs solarSystemId={systemId} />
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
          <Link
            href={`https://www.adam4eve.eu/location.php?id=${systemId}`}
            target="_blank"
          >
            <Button>
              <Group spacing="xs">
                <IconExternalLink size={14} />
                Adam4EVE
              </Group>
            </Button>
          </Link>
        </Group>
        <Title order={4}>Stations</Title>
        <Stack spacing="xs">
          {solarSystem?.data.stations?.map((stationId) => (
            <Group key={stationId} spacing="xs">
              <StationAvatar size="sm" stationId={stationId} />
              <StationAnchor stationId={stationId}>
                <StationName span stationId={stationId} />
              </StationAnchor>
            </Group>
          ))}
        </Stack>
        <Title order={4}>Stargates</Title>
        <Stack spacing="xs">
          {solarSystem?.data.stargates?.map((stargateId) => (
            <Group key={stargateId} spacing="xs">
              <StargateAvatar size="sm" stargateId={stargateId} />
              <StargateDestinationAnchor stargateId={stargateId}>
                <StargateName span stargateId={stargateId} />
              </StargateDestinationAnchor>
            </Group>
          ))}
        </Stack>
        <Title order={4}>Celestials</Title>
        <Stack spacing="xs">
          {solarSystem?.data.star_id && (
            <Group>
              <StarAvatar starId={solarSystem.data.star_id} size="sm" />
              <StarAnchor starId={solarSystem.data.star_id}>
                <StarName span starId={solarSystem.data.star_id} />
              </StarAnchor>
            </Group>
          )}
          {solarSystem?.data.planets?.map(
            ({ planet_id, moons, asteroid_belts }) => (
              <Group key={planet_id}>
                <Group wrap="nowrap">
                  <PlanetAvatar planetId={planet_id} size="sm" />
                  <Anchor component={Link} href={`/planet/${planet_id}`}>
                    <PlanetName span planetId={planet_id} />
                  </Anchor>
                </Group>
                <Group spacing="xs">
                  {moons?.map((moonId) => (
                    <Tooltip label={<MoonName moonId={moonId} />} key={moonId}>
                      <div>
                        <TypeAvatar typeId={14} size="xs" />
                      </div>
                    </Tooltip>
                  ))}
                  {asteroid_belts?.map((asteroidBeltId) => (
                    <Tooltip
                      label={
                        <AsteroidBeltName asteroidBeltId={asteroidBeltId} />
                      }
                      key={asteroidBeltId}
                    >
                      <div>
                        <TypeAvatar typeId={15} size="xs" />
                      </div>
                    </Tooltip>
                  ))}
                </Group>
              </Group>
            ),
          )}
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
        <Group position="apart">
          <Text>Security Class</Text>
          <Text>{solarSystem?.data.security_class}</Text>
        </Group>
        <Group position="apart">
          <Text>Luminosity</Text>
          <Text>{sdeSolarSystem?.data.luminosity}</Text>
        </Group>
        {sdeSolarSystem?.data.radius && (
          <Group position="apart">
            <Text>Radius</Text>
            <Text>{sdeSolarSystem.data.radius.toLocaleString()} m</Text>
          </Group>
        )}
        <Group position="apart">
          <Text>Border System</Text>
          <Text>{sdeSolarSystem?.data.border ? "Yes" : "No"}</Text>
        </Group>
        <Group position="apart">
          <Text>Corridor System</Text>
          <Text>{sdeSolarSystem?.data.corridor ? "Yes" : "No"}</Text>
        </Group>
        <Group position="apart">
          <Text>Fringe System</Text>
          <Text>{sdeSolarSystem?.data.fringe ? "Yes" : "No"}</Text>
        </Group>
        <Group position="apart">
          <Text>Trading Hub</Text>
          <Text>{sdeSolarSystem?.data.hub ? "Yes" : "No"}</Text>
        </Group>
        <Group position="apart">
          <Text>International System</Text>
          <Text>{sdeSolarSystem?.data.international ? "Yes" : "No"}</Text>
        </Group>
        <Group position="apart">
          <Text>Regional System</Text>
          <Text>{sdeSolarSystem?.data.regional ? "Yes" : "No"}</Text>
        </Group>
        <Group position="apart">
          <Text>Position</Text>
          <Position3DText
            size="xs"
            position={
              sdeSolarSystem?.data.center as
                | [number, number, number]
                | undefined
            }
          />
        </Group>
        <Group position="apart">
          <Text>Min Coordinates</Text>
          <Position3DText
            size="xs"
            position={
              sdeSolarSystem?.data.min as [number, number, number] | undefined
            }
          />
        </Group>
        <Group position="apart">
          <Text>Max Coordinates</Text>
          <Position3DText
            size="xs"
            position={
              sdeSolarSystem?.data.max as [number, number, number] | undefined
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
