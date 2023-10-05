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
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { useGetUniverseStationsStationId } from "@jitaspace/esi-client-kubb";
import {
  EveEntityAnchor,
  EveEntityName,
  RaceName,
  SetAutopilotDestinationActionIcon,
  SolarSystemName,
  SolarSystemSecurityStatusBadge,
  StationAvatar,
  StationName,
  TypeName,
} from "@jitaspace/ui";

import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const stationId = router.query.stationId as string;
  const { data: station } = useGetUniverseStationsStationId(
    parseInt(stationId),
  );

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <StationAvatar stationId={stationId} size="xl" radius={256} />
          <Title order={3}>
            <StationName span stationId={stationId} />
          </Title>
          <SetAutopilotDestinationActionIcon destinationId={stationId} />
        </Group>
        <Group>
          <Link
            href={`https://evemaps.dotlan.net/station/${stationId}`}
            target="_blank"
          >
            <Button>
              <Group spacing="xs">
                <IconExternalLink size={14} />
                DOTLAN EveMaps
              </Group>
            </Button>
          </Link>
        </Group>
        <Group position="apart">
          <Text>Solar System</Text>
          <Group spacing="xs">
            <SolarSystemSecurityStatusBadge
              solarSystemId={station?.data.system_id}
              size="sm"
            />
            <Anchor
              component={Link}
              href={`/system/${station?.data.system_id}`}
            >
              <SolarSystemName span solarSystemId={station?.data.system_id} />
            </Anchor>
          </Group>
        </Group>
        <Group position="apart">
          <Text>Station Type</Text>
          <Anchor component={Link} href={`/type/${station?.data.type_id}`}>
            <TypeName span typeId={station?.data.type_id} />
          </Anchor>
        </Group>
        <Group position="apart">
          <Text>Race</Text>
          <Anchor component={Link} href={`/race/${station?.data.race_id}`}>
            <RaceName span raceId={station?.data.race_id} />
          </Anchor>
        </Group>
        <Group position="apart">
          <Text>Owner</Text>
          <EveEntityAnchor entityId={station?.data.owner}>
            <EveEntityName entityId={station?.data.owner} />
          </EveEntityAnchor>
        </Group>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
