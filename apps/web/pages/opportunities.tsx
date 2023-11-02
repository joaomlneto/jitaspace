import React, { useMemo, type ReactElement } from "react";
import { GetStaticProps } from "next";
import { Accordion, Container, Group, Stack, Text, Title } from "@mantine/core";
import { NextSeo } from "next-seo";

import {
  getOpportunitiesGroups,
  getOpportunitiesGroupsGroupId,
  getOpportunitiesTasks,
  getOpportunitiesTasksTaskId,
} from "@jitaspace/esi-client";
import { OpportunitiesTreeIcon } from "@jitaspace/eve-icons";
import { OpportunityGroup, OpportunityTask } from "@jitaspace/hooks";

import { MailMessageViewer } from "~/components/EveMail";
import { MainLayout } from "~/layouts";


type PageProps = {
  opportunities: Record<
    number,
    OpportunityGroup & {
      tasks: OpportunityTask[];
    }
  >;
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    // Get all IDs for groups and tasks
    const { data: opportunityGroupIds } = await getOpportunitiesGroups();
    const { data: opportunityTaskIds } = await getOpportunitiesTasks();

    // get data of all groups
    const opportunityGroupsResponses = await Promise.all(
      opportunityGroupIds.map(async (opportunityGroupId) =>
        getOpportunitiesGroupsGroupId(opportunityGroupId).then(
          (res) => res.data,
        ),
      ),
    );

    // get data of all tasks
    const opportunityTasksResponses = await Promise.all(
      opportunityTaskIds.map(async (opportunityTaskId) =>
        getOpportunitiesTasksTaskId(opportunityTaskId).then((res) => res.data),
      ),
    );

    const opportunityGroups: Record<
      number,
      OpportunityGroup & {
        tasks: OpportunityTask[];
      }
    > = {};
    opportunityGroupsResponses.forEach((opportunityGroup) => {
      opportunityGroups[opportunityGroup.group_id] = {
        ...opportunityGroup,
        tasks: opportunityTasksResponses.filter((task) =>
          opportunityGroup.required_tasks.includes(task.task_id),
        ),
      };
    });

    return {
      props: {
        opportunities: opportunityGroups,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 30, // 30 seconds on error
    };
  }
};

export default function Page({ opportunities }: PageProps) {
  const sortedGroups = useMemo(
    () =>
      Object.values(opportunities).sort((a, b) => a.name.localeCompare(b.name)),
    [opportunities],
  );
  return (
    <Container size="md">
      <Stack>
        <Group>
          <OpportunitiesTreeIcon width={48} />
          <Title>Opportunities</Title>
        </Group>
        <Accordion variant="separated">
          {sortedGroups.map((group) => (
            <Accordion.Item value={`${group.group_id}`} key={group.group_id}>
              <Accordion.Control>
                <Title order={3}>{group.name}</Title>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack>
                  <Text>{group.description}</Text>
                  <Title order={4}>Tasks</Title>
                  {group.tasks.map((task) => (
                    <div key={task.task_id}>
                      <Title order={6}>{task.name}</Title>

                      <MailMessageViewer content={task.description} />
                    </div>
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Opportunities" />
      {page}
    </MainLayout>
  );
};
