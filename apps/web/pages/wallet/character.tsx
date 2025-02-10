import React, { type ReactElement } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import { WalletIcon } from "@jitaspace/eve-icons";
import {
  useCharacterWalletJournal,
  useSelectedCharacter,
} from "@jitaspace/hooks";

import { WalletTable } from "~/components/Wallet";
import { MainLayout } from "~/layouts";


export default function Page() {
  const character = useSelectedCharacter();
  const { data } = useCharacterWalletJournal(character?.characterId);

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

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return (
    <MainLayout>
      <NextSeo title="Character Wallet" />
      {page}
    </MainLayout>
  );
};

Page.requiredScopes = ["esi-wallet.read_character_wallet.v1"];
