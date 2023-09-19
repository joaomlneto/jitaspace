import React, { type ReactElement } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";

import { MarketIcon } from "@jitaspace/eve-icons";

import { MainLayout } from "~/layouts";

export default function Page() {
  return (
    <Container>
      <Stack gap="xl">
        <Group>
          <MarketIcon width={48} />
          <Title order={1}>Market</Title>
        </Group>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
