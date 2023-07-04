import React, { type ReactElement } from "react";
import { Container, Stack } from "@mantine/core";

import { EsiClientStateCard } from "~/components/EsiClient";
import { MainLayout } from "~/layouts";

export default function Page() {
  return (
    <Container size="lg">
      <Stack>
        <EsiClientStateCard />
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
