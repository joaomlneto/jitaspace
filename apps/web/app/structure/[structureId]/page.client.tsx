"use client";

import { useParams } from "next/navigation";
import { Container, Group, Stack, Text, Title } from "@mantine/core";

import {
  EveEntityName,
  SolarSystemAnchor,
  SolarSystemName,
  StructureName,
  TypeAnchor,
  TypeName,
} from "@jitaspace/eve-components";
import { useSelectedCharacter, useStructure } from "@jitaspace/hooks";

import { SetAutopilotDestinationActionIcon } from "~/components/ActionIcon";
import { StructureAvatar } from "~/components/Avatar";
import { SolarSystemSecurityStatusBadge } from "~/components/Badge";
import { ScopeGuard } from "~/components/ScopeGuard";

export default function Page() {
  const params = useParams();
  const rawStructureId = params.structureId;
  const structureId = Number(
    typeof rawStructureId === "string" ? rawStructureId : rawStructureId?.[0],
  );
  const character = useSelectedCharacter();
  const { data: structure } = useStructure(structureId);

  if (!Number.isFinite(structureId)) {
    return null;
  }

  return (
    <ScopeGuard requiredScopes={["esi-universe.read_structures.v1"]}>
      <Container size="sm">
        <Stack>
          <Group gap="xl">
            <StructureAvatar structureId={structureId} size="xl" radius={256} />
            <Title order={3}>
              <StructureName span structureId={structureId} />
            </Title>
            {character && (
              <SetAutopilotDestinationActionIcon
                characterId={character.characterId}
                destinationId={structureId}
              />
            )}
          </Group>
          <Group justify="space-between">
            <Text>Solar System</Text>
            <Group gap="xs">
              <SolarSystemSecurityStatusBadge
                solarSystemId={structure?.data.solar_system_id}
                size="sm"
              />
              <SolarSystemAnchor
                solarSystemId={structure?.data.solar_system_id}
              >
                <SolarSystemName
                  span
                  solarSystemId={structure?.data.solar_system_id}
                />
              </SolarSystemAnchor>
            </Group>
          </Group>
          <Group justify="space-between">
            <Text>Structure Type</Text>
            <TypeAnchor typeId={structure?.data.type_id}>
              <TypeName span typeId={structure?.data.type_id} />
            </TypeAnchor>
          </Group>
          <Group justify="space-between">
            <Text>Owner</Text>
            <EveEntityName entityId={structure?.data.owner_id} />
          </Group>
        </Stack>
      </Container>
    </ScopeGuard>
  );
}
