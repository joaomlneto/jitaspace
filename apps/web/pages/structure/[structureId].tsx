import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Anchor, Container, Group, Stack, Text, Title } from "@mantine/core";

import { useStructure } from "@jitaspace/hooks";
import {
  EveEntityName,
  SetAutopilotDestinationActionIcon,
  SolarSystemName,
  SolarSystemSecurityStatusBadge,
  StructureAvatar,
  StructureName,
  TypeName,
} from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const structureId = parseInt(router.query.structureId as string);
  const { data: structure } = useStructure(structureId);

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <StructureAvatar structureId={structureId} size="xl" radius={256} />
          <Title order={3}>
            <StructureName span structureId={structureId} />
          </Title>
          <SetAutopilotDestinationActionIcon destinationId={structureId} />
        </Group>
        <Group position="apart">
          <Text>Solar System</Text>
          <Group spacing="xs">
            <SolarSystemSecurityStatusBadge
              solarSystemId={structure?.data.solar_system_id}
              size="sm"
            />
            <Anchor
              component={Link}
              href={`/system/${structure?.data.solar_system_id}`}
            >
              <SolarSystemName
                span
                solarSystemId={structure?.data.solar_system_id}
              />
            </Anchor>
          </Group>
        </Group>
        <Group position="apart">
          <Text>Structure Type</Text>
          <Anchor component={Link} href={`/type/${structure?.data.type_id}`}>
            <TypeName span typeId={structure?.data.type_id} />
          </Anchor>
        </Group>
        <Group position="apart">
          <Text>Owner</Text>
          <EveEntityName entityId={structure?.data.owner_id} />
        </Group>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

Page.requiredScopes = ["esi-universe.read_structures.v1"];
