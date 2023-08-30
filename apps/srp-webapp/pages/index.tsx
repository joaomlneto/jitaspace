import React, { type ReactElement } from "react";
import { Container, Title } from "@mantine/core";

import { MainLayout } from "~/layouts";

export default function Page() {
  return (
    <Container size="lg">
      <Title order={3}>Hello World</Title>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
