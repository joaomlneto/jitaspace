import React, { type ReactElement } from "react";
import { GetStaticProps } from "next";
import { Container, Grid, Group, Stack, Title } from "@mantine/core";

import { prisma } from "@jitaspace/db";
import { SkillsIcon } from "@jitaspace/eve-icons";
import { useSelectedCharacter } from "@jitaspace/hooks";

import {
  CharacterAttributesRingProgress,
  SkillQueueTimeline,
  SkillTreeNav,
} from "~/components/Skills";
import { MainLayout } from "~/layouts";

const SKILLS_CATEGORY_ID = 16;

type PageProps = {
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
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  const groups = await prisma.group.findMany({
    select: {
      groupId: true,
      name: true,
      published: true,
      types: {
        select: {
          typeId: true,
          name: true,
          description: true,
          iconId: true,
          graphicId: true,
          published: true,
          attributes: {
            select: {
              attributeId: true,
              value: true,
            },
          },
        },
      },
    },
    where: {
      categoryId: SKILLS_CATEGORY_ID,
    },
  });

  return {
    props: {
      groups,
    },
    revalidate: 24 * 3600, // every 24 hours
  };
};

export default function Page({ groups }: PageProps) {
  const character = useSelectedCharacter();
  return (
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
  );
}

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return <MainLayout>{page}</MainLayout>;
};

Page.requiredScopes = [
  "esi-skills.read_skills.v1",
  "esi-skills.read_skillqueue.v1",
];
