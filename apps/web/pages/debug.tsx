import type { ReactElement } from "react";
import React from "react";
import { GetStaticProps } from "next";
import {
  Container,
  Group,
  SimpleGrid,
  Stack,
  Table,
  TableData,
  Text,
  Title,
} from "@mantine/core";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { FolderIcon } from "@jitaspace/eve-icons";
import { kv } from "@jitaspace/kv";

import { MainLayout } from "~/layouts";

type PageProps = {
  database: {
    name: string;
    count: any;
  }[];
  queues: Record<string, string | number>[];
  vars: Record<string, any>;
};

export const getStaticProps: GetStaticProps<PageProps> = async () => {
  const queues = Object.values(kv.queues);

  const queuesStatus = await Promise.all(
    queues.map(async (queue) => ({
      paused: (await queue.isPaused()) ? "Yes" : "No",
      size: await queue.count(),
      active: await queue.getActiveCount(),
      completed: await queue.getCompletedCount(),
      failed: await queue.getFailedCount(),
      delayed: await queue.getDelayedCount(),
      waiting: await queue.getWaitingCount(),
      workers: (await queue.getWorkers()).length,
      name: queue.name,
    })),
  );

  const dbModels = Object.keys(prisma).filter(
    (key) =>
      !key.startsWith("_") &&
      !key.startsWith("$") &&
      ![
        "constructor",
        "$connect",
        "$disconnect",
        "executeRaw",
        "queryRaw",
        "transaction",
      ].includes(key),
  );
  dbModels.sort();

  const dbStats = await Promise.all(
    dbModels.map(async (name) => ({
      name,
      // @ts-expect-error i don't know how to type this
      count: await prisma[name as keyof typeof prisma].count(),
    })),
  );

  return {
    props: {
      database: dbStats,
      queues: queuesStatus,
      vars: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
        DATABASE_URL: process.env.DATABASE_URL,
        REDIS_URL: process.env.REDIS_URL,
        EVE_CLIENT_ID: process.env.EVE_CLIENT_ID,
        EVE_CLIENT_SECRET: process.env.EVE_CLIENT_SECRET,
        INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
        CRON_SECRET: process.env.CRON_SECRET,
        SKIP_BUILD_STATIC_GENERATION: process.env.SKIP_BUILD_STATIC_GENERATION,
        NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
        NEXT_PUBLIC_GOOGLE_TAG_ID: process.env.NEXT_PUBLIC_GOOGLE_TAG_ID,
        NEXT_PUBLIC_DISCORD_INVITE_LINK:
          process.env.NEXT_PUBLIC_DISCORD_INVITE_LINK,
      },
    },
    notFound: process.env.NODE_ENV === "production",
  };
};

export default function Page({ database, queues, vars }: Readonly<PageProps>) {
  const queueKeys = [
    "name",
    "paused",
    "workers",
    "size",
    "active",
    "completed",
    "failed",
    "delayed",
    "waiting",
  ];
  const queueTableData: TableData = {
    head: queueKeys,
    body: queues.map((queue) => queueKeys.map((key) => queue[key])),
  };

  return (
    <Container size="md">
      <Stack>
        <Group>
          <FolderIcon width={48} />
          <Title>Environment Variables</Title>
        </Group>
        {Object.entries(vars).map(([key, value]) => (
          <Group key={key} justify="space-between" wrap="nowrap" gap="xl">
            <div>
              <Text size="xs">{key}</Text>
            </div>
            <div>
              <Text size="xs">{value}</Text>
            </div>
          </Group>
        ))}
        <Group>
          <FolderIcon width={48} />
          <Title>Job Queues</Title>
        </Group>
        <Table data={queueTableData} />
        <Group>
          <FolderIcon width={48} />
          <Title>Database</Title>
        </Group>
        <SimpleGrid
          cols={{
            xs: 1,
            sm: 2,
            md: 2,
            lg: 3,
            xl: 3,
          }}
        >
          {database.map((item) => (
            <Group
              key={item.name}
              justify="space-between"
              wrap="nowrap"
              gap="xl"
            >
              <div>
                <Text size="sm">{item.name}</Text>
              </div>
              <div>
                <Text size="sm">{item.count}</Text>
              </div>
            </Group>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement<any>) {
  return (
    <MainLayout>
      <NextSeo title="Development" />
      {page}
    </MainLayout>
  );
};
