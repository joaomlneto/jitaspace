"use client";

import { Container, Grid, Group, Stack, Title } from "@mantine/core";

import { SkillsIcon } from "@jitaspace/eve-icons";
import { useSelectedCharacter } from "@jitaspace/hooks";

import {
  CharacterAttributesRingProgress,
  SkillQueueTimeline,
  SkillTreeNav,
} from "~/components/Skills";
import { ScopeGuard } from "~/components/ScopeGuard";

export interface SkillsPageProps {
  groups: {
    groupId: number;
    name: string;
    published: boolean;
    types: {
      typeId: number;
      name: string;
      description: string;
      iconId: number | null;
      graphicId: number | null;
      published: boolean;
      attributes: {
        attributeId: number;
        value: number;
      }[];
    }[];
  }[];
}

export default function SkillsPage({ groups }: SkillsPageProps) {
  const character = useSelectedCharacter();
  return (
    <ScopeGuard
      requiredScopes={[
        "esi-skills.read_skills.v1",
        "esi-skills.read_skillqueue.v1",
      ]}
    >
      <Container size="xl">
        <Stack gap="xl">
          <Group>
            <SkillsIcon width={48} />
            <Title>Skills</Title>
          </Group>
          {character && (
            <CharacterAttributesRingProgress
              characterId={character.characterId}
            />
          )}
          <Grid>
            <Grid.Col span="content">
              {character && (
                <SkillQueueTimeline characterId={character.characterId} />
              )}
            </Grid.Col>
            <Grid.Col span="auto" miw={690}>
              {character && (
                <SkillTreeNav
                  characterId={character.characterId}
                  groups={groups}
                />
              )}
            </Grid.Col>
          </Grid>
        </Stack>
      </Container>
    </ScopeGuard>
  );
}
