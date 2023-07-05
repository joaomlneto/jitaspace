import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Anchor, Container, Group, Stack, Text, Title } from "@mantine/core";

import {
  useEsiClientContext,
  useGetUniverseStructuresStructureId,
} from "@jitaspace/esi-client";
import {
  EveEntityName,
  SolarSystemName,
  StructureAvatar,
  StructureName,
  TypeName,
} from "@jitaspace/ui";

import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const structureId = router.query.structureId as string;
  const { isTokenValid, scopes } = useEsiClientContext();
  const { data: structure, error } = useGetUniverseStructuresStructureId(
    parseInt(structureId),
    {},
    {
      swr: {
        enabled:
          isTokenValid &&
          !!structureId &&
          scopes.includes("esi-universe.read_structures.v1"),
      },
    },
  );

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <StructureAvatar structureId={structureId} size="xl" radius={256} />
          <Title order={3}>
            <StructureName span structureId={structureId} />
          </Title>
        </Group>
        <Group position="apart">
          <Text>Solar System</Text>
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
  return <MailLayout>{page}</MailLayout>;
};
