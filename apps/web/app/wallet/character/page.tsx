"use client";

import { Container, Group, Stack, Title } from "@mantine/core";

import { WalletIcon } from "@jitaspace/eve-icons";
import {
  useCharacterWalletJournal,
  useSelectedCharacter,
} from "@jitaspace/hooks";

import { PageSkeleton } from "~/components/PageSkeleton";
import { WalletTable } from "~/components/Wallet";
import { ScopeGuard } from "~/components/ScopeGuard";

export default function Page() {
  const character = useSelectedCharacter();
  const { data } = useCharacterWalletJournal(character?.characterId);

  return (
    <ScopeGuard
      requiredScopes={["esi-wallet.read_character_wallet.v1"]}
      loadingScopesComponent={<PageSkeleton />}
    >
      <Container size="xl">
        <Stack>
          <Group>
            <WalletIcon width={48} />
            <Title>Wallet</Title>
          </Group>
          <WalletTable entries={data?.data ?? []} />
        </Stack>
      </Container>
    </ScopeGuard>
  );
}
