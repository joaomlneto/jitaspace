import React, { type ReactElement } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { useGetCharactersCharacterIdWalletJournal } from "@jitaspace/esi-client-kubb";
import { useEsiClientContext } from "@jitaspace/esi-hooks";
import { WalletIcon } from "@jitaspace/eve-icons";

import { WalletTable } from "~/components/Wallet";
import { MainLayout } from "~/layouts";

export default function Page() {
  const { characterId, scopes, isTokenValid } = useEsiClientContext();
  const { data } = useGetCharactersCharacterIdWalletJournal(
    characterId ?? 0,
    {},
    {
      swr: {
        enabled:
          isTokenValid &&
          characterId !== undefined &&
          scopes.includes("esi-wallet.read_character_wallet.v1"),
      },
    },
  );

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <WalletIcon width={48} />
          <Title>Wallet</Title>
        </Group>
        <WalletTable entries={data?.data ?? []} />
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Character Wallet" />
      {page}
    </MainLayout>
  );
};

Page.requiredScopes = ["esi-wallet.read_character_wallet.v1"];
