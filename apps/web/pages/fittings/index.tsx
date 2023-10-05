import React, { useMemo, useState, type ReactElement } from "react";
import {
  Container,
  Group,
  JsonInput,
  Stack,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import { NextSeo } from "next-seo";

import { useGetCharactersCharacterIdFittings } from "@jitaspace/esi-client-kubb";
import { useEsiClientContext } from "@jitaspace/esi-hooks";
import { FittingIcon } from "@jitaspace/eve-icons";
import { EveEntitySelect } from "@jitaspace/ui";

import { EsiCharacterShipFittingCard } from "~/components/Fitting";
import { MainLayout } from "~/layouts";

export default function Page() {
  const [selectedShipType, setSelectedShipType] = useState<string | null>(null);
  const { characterId, isTokenValid, scopes } = useEsiClientContext();
  const { data } = useGetCharactersCharacterIdFittings(
    characterId ?? 0,
    {},
    {
      swr: {
        enabled:
          isTokenValid &&
          !!characterId &&
          scopes.includes("esi-fittings.read_fittings.v1"),
      },
    },
  );

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

  return (
    <Container size="xs">
      <Stack>
        <Group>
          <FittingIcon width={48} />
          <Title order={1}>Fittings</Title>
        </Group>
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
        <Stack spacing="xs">
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
              <EsiCharacterShipFittingCard
                fittingId={fit.fitting_id}
                hideModules
              />
            </UnstyledButton>
          ))}
        </Stack>
        {false && (
          <JsonInput value={JSON.stringify(data, null, 2)} readOnly autosize />
        )}
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
