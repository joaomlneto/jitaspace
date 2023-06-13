import React, { type ReactElement } from "react";
import { Container, Group, Stack, Title } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdSkillqueue } from "@jitaspace/esi-client";
import { SkillsIcon } from "@jitaspace/eve-icons";

import {
  CharacterAttributesRingProgress,
  SkillQueueTimeline,
} from "~/components/Skills";
import { MainLayout } from "~/layouts";

export default function Page() {
  const { data: session } = useSession();
  const { data: attributes } = useGetCharactersCharacterIdSkillqueue(
    session?.user?.id ?? 1,
    {},
    {
      swr: {
        enabled: !!session?.user?.id,
      },
    },
  );

  return (
    <Container size="xl">
      <Stack spacing="xl">
        <Group>
          <SkillsIcon width={48} />
          <Title>Skills</Title>
        </Group>
        <CharacterAttributesRingProgress />
        <SkillQueueTimeline />
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
