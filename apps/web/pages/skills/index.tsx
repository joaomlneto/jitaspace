import React, { type ReactElement } from "react";
import { Container, Grid, Group, Stack, Title } from "@mantine/core";

import { SkillsIcon } from "@jitaspace/eve-icons";

import {
  CharacterAttributesRingProgress,
  SkillQueueTimeline,
  SkillTree,
} from "~/components/Skills";
import { MainLayout } from "~/layouts";

export default function Page() {
  return (
    <Container size="xl">
      <Stack spacing="xl">
        <Group>
          <SkillsIcon width={48} />
          <Title>Skills</Title>
        </Group>
        <CharacterAttributesRingProgress />
        <Grid>
          <Grid.Col span="auto">
            <SkillTree />
          </Grid.Col>
          <Grid.Col span="content">
            <SkillQueueTimeline />
          </Grid.Col>
        </Grid>
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
