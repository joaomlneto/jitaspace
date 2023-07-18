import React, { type ReactElement } from "react";
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

import {
  useEsiClientContext,
  useGetCharactersCharacterIdFittings,
} from "@jitaspace/esi-client";
import { FittingIcon } from "@jitaspace/eve-icons";

import { ShipFittingCard } from "~/components/fitting";
import { MainLayout } from "~/layouts";

export default function Page() {
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
  return (
    <Container size="sm">
      <Stack>
        <Group>
          <FittingIcon width={48} />
          <Title order={1}>Fittings</Title>
        </Group>
        {data?.data.map((fit) => (
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
            <ShipFittingCard
              name={fit.name}
              description={fit.description}
              fittingId={fit.fitting_id}
              shipTypeId={fit.ship_type_id}
              items={fit.items.map((item) => ({
                typeId: item.type_id,
                flag: item.flag,
                quantity: item.quantity,
              }))}
              hideModules
            />
          </UnstyledButton>
        ))}
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
