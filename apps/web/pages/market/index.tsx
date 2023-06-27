import React, { type ReactElement } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";

import { MarketIcon } from "@jitaspace/eve-icons";

import { MarketGroupsNav } from "~/components/Market";
import { usePrecomputedMarketGroups } from "~/hooks/usePrecomputedMarketGroups";
import { MainLayout } from "~/layouts";

export default function Page() {
  const groups = usePrecomputedMarketGroups();
  return (
    <Container>
      <Stack spacing="xl">
        <Group>
          <MarketIcon width={48} />
          <Title order={1}>Market</Title>
        </Group>
        <Stack>
          <MarketGroupsNav />
        </Stack>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
