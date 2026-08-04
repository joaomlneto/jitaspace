"use client";

import { useMemo, useState } from "react";
import {
  Container,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import posthog from "posthog-js";

import type { ESIScope } from "@jitaspace/esi-metadata";
import { EveEntitySelect } from "@jitaspace/eve-components";
import { FittingIcon } from "@jitaspace/eve-icons";
import {
  useMultipleCharacterFittings,
  useSelectedCharacter,
} from "@jitaspace/hooks";

import {
  EsiCharacterShipFittingCard,
  EsiCurrentShipFittingCard,
} from "~/components/Fitting";
import { ScopeGuard } from "~/components/ScopeGuard";

export default function Page() {
  const [selectedShipType, setSelectedShipType] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );
  const character = useSelectedCharacter();
  // Every logged-in character that granted the fittings scope, not just the
  // selected one. Each fitting carries the character it belongs to as
  // `subjectId`.
  const { data: fittings } = useMultipleCharacterFittings();

  const shipTypeIds = useMemo(
    () => [...new Set(fittings.map((fitting) => fitting.ship_type_id))],
    [fittings],
  );

  const characterIds = useMemo(
    () => [...new Set(fittings.map((fitting) => fitting.subjectId))],
    [fittings],
  );

  const filteredFittings = useMemo(
    () =>
      fittings.filter(
        (fit) =>
          (selectedShipType === null ||
            fit.ship_type_id === Number.parseInt(selectedShipType, 10)) &&
          (selectedCharacterId === null ||
            fit.subjectId === Number.parseInt(selectedCharacterId, 10)),
      ),
    [fittings, selectedShipType, selectedCharacterId],
  );

  const requiredScopesForCurrentFit: ESIScope[] = [
    "esi-assets.read_assets.v1",
    "esi-location.read_ship_type.v1",
  ];
  const hasScopesForCurrentFit = useMemo(
    () =>
      requiredScopesForCurrentFit.every((requiredScope) =>
        character?.accessTokenPayload.scp.includes(requiredScope),
      ),
    [requiredScopesForCurrentFit, character?.accessTokenPayload.scp],
  );

  return (
    <ScopeGuard requiredScopes={["esi-fittings.read_fittings.v1"]}>
      <Container size="xs">
        <Stack>
          <Group>
            <FittingIcon width={48} />
            <Title order={1}>Fittings</Title>
          </Group>
          <Title order={4}>Current Ship Fitting</Title>
          {character && hasScopesForCurrentFit ? (
            <UnstyledButton
              onClick={() => {
                posthog.capture("current_ship_fitting_viewed", {
                  character_id: character.characterId,
                });
                openContextModal({
                  modal: "currentShipFitting",
                  withCloseButton: false,
                  size: "sm",
                  padding: 0,
                  innerProps: { characterId: character.characterId },
                  style: {
                    padding: 0,
                    margin: 0,
                  },
                });
              }}
            >
              <EsiCurrentShipFittingCard
                characterId={character.characterId}
                hideModules
              />
            </UnstyledButton>
          ) : (
            <Text c="dimmed" size="sm">
              Insufficient permissions to get current fit of character.
            </Text>
          )}
          <Title order={4}>Saved Fittings</Title>
          <Group>
            <EveEntitySelect
              size="xs"
              label="Filter by ship type"
              entityIds={shipTypeIds.map((id) => ({
                id,
              }))}
              searchable
              allowDeselect
              clearable
              value={selectedShipType}
              onChange={setSelectedShipType}
            />
            <EveEntitySelect
              size="xs"
              label="Filter by character"
              entityIds={characterIds.map((id) => ({
                id,
              }))}
              searchable
              allowDeselect
              clearable
              value={selectedCharacterId}
              onChange={setSelectedCharacterId}
            />
          </Group>
          <Stack gap="xs">
            {filteredFittings.map((fit) => (
              <UnstyledButton
                // fitting_id is only unique within a character, so two
                // characters can hold the same id.
                key={`${fit.subjectId}-${fit.fitting_id}`}
                onClick={() => {
                  posthog.capture("fitting_viewed", {
                    fitting_id: fit.fitting_id,
                    ship_type_id: fit.ship_type_id,
                    fitting_name: fit.name,
                    character_id: fit.subjectId,
                  });
                  openContextModal({
                    modal: "fitting",
                    withCloseButton: false,
                    size: "sm",
                    padding: 0,
                    innerProps: {
                      name: fit.name,
                      description: fit.description,
                      fittingId: fit.fitting_id,
                      shipTypeId: fit.ship_type_id,
                      items: fit.items.map((item) => ({
                        typeId: item.type_id,
                        flag: item.flag,
                        quantity: item.quantity,
                      })),
                    },
                    style: {
                      padding: 0,
                      margin: 0,
                    },
                  });
                }}
              >
                <EsiCharacterShipFittingCard
                  characterId={fit.subjectId}
                  fittingId={fit.fitting_id}
                  hideModules
                />
              </UnstyledButton>
            ))}
          </Stack>
        </Stack>
      </Container>
    </ScopeGuard>
  );
}
