import React, { type ReactElement } from "react";
import { GetStaticProps } from "next";
import { Container, Grid, Group, Stack, Title } from "@mantine/core";
import axios from "axios";

import {
  getUniverseCategoriesCategoryId,
  getUniverseGroupsGroupId,
  GetUniverseGroupsGroupId200,
} from "@jitaspace/esi-client";
import { SkillsIcon } from "@jitaspace/eve-icons";

import {
  CharacterAttributesRingProgress,
  SkillQueueTimeline,
  SkillTreeNav,
} from "~/components/Skills";
import { ESI_BASE_URL } from "~/config/constants";
import { MainLayout } from "~/layouts";

type PageProps = {
  groups: Record<number, GetUniverseGroupsGroupId200>;
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  axios.defaults.baseURL = ESI_BASE_URL;

  const SKILLS_CATEGORY_ID = 16;
  const { data: category } =
    await getUniverseCategoriesCategoryId(SKILLS_CATEGORY_ID);

  const groupResponses = await Promise.all(
    category.groups.map((groupId) => getUniverseGroupsGroupId(groupId)),
  );

  // restructure data into a map of group ids to group details
  const groups: Record<number, GetUniverseGroupsGroupId200> = {};
  groupResponses.forEach((res) => {
    groups[res.data.group_id] = res.data;
  });

  return {
    props: {
      groups,
    },
    revalidate: 24 * 3600, // every 24 hours
  };
};

export default function Page({ groups }: PageProps) {
  return (
    <Container size="xl">
      <Stack spacing="xl">
        <Group>
          <SkillsIcon width={48} />
          <Title>Skills</Title>
        </Group>
        <CharacterAttributesRingProgress />
        <Grid>
          <Grid.Col span="content">
            <SkillQueueTimeline />
          </Grid.Col>
          <Grid.Col span="auto" miw={690}>
            <SkillTreeNav groups={groups} />
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
