import React, { type ReactElement } from "react";
import { Container, Stack, Text, Title } from "@mantine/core";

import { MainLayout } from "~/layouts";

export default function Page() {
  return (
    <Container>
      <Stack spacing="xl">
        <Title>Skills</Title>
        <Text>Coming Soon!</Text>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

Page.requiredScopes = [
  "esi-skills.read_skills.v1",
  "esi-skills.read_skillqueue.v1",
];
