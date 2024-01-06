import React, { useMemo, useState, type ReactElement } from "react";
import {
  Container,
  Group,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import { NextSeo } from "next-seo";

import { ESIScope } from "@jitaspace/esi-metadata";
import { FittingIcon } from "@jitaspace/eve-icons";
import { useCharacterFittings, useSelectedCharacter } from "@jitaspace/hooks";
import { EveEntitySelect } from "@jitaspace/ui";

import {
  EsiCharacterShipFittingCard,
  EsiCurrentShipFittingCard,
} from "~/components/Fitting";
import { MainLayout } from "~/layouts";


export default function Page() {
  const [selectedShipType, setSelectedShipType] = useState<string | null>(null);
  const character = useSelectedCharacter();
  const { data } = useCharacterFittings(character?.characterId);

  const shipTypeIds = useMemo(
    () => [...new Set(data?.data.map((fitting) => fitting.ship_type_id) ?? [])],
    [data?.data],
  );

  const filteredFittings = useMemo(
    () =>
      data?.data.filter(
        (fit) =>
          selectedShipType === null ||
          fit.ship_type_id === parseInt(selectedShipType),
      ) ?? [],
    [data?.data, selectedShipType],
  );

  const requiredScopesForCurrentFit: ESIScope[] = [
    "esi-assets.read_assets.v1",
    "esi-location.read_ship_type.v1",
  ];
  const hasScopesForCurrentFit = useMemo(
    () =>
      requiredScopesForCurrentFit.every(
        (requiredScope) =>
          character?.accessTokenPayload.scp.includes(requiredScope),
      ),
    [requiredScopesForCurrentFit, character?.accessTokenPayload.scp],
  );

  return (
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
        </Group>
        <Stack gap="xs">
          {filteredFittings.map((fit) => (
            <UnstyledButton
              key={fit.fitting_id}
              onClick={() => {
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
              {character && (
                <EsiCharacterShipFittingCard
                  characterId={character.characterId}
                  fittingId={fit.fitting_id}
                  hideModules
                />
              )}
            </UnstyledButton>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Fittings" />
      {page}
    </MainLayout>
  );
};

Page.requiredScopes = ["esi-fittings.read_fittings.v1"];
