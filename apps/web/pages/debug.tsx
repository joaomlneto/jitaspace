import type { GetStaticProps } from "next";
import type { ReactElement } from "react";
import { useState } from "react";
import {
  Container,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import { NextSeo } from "next-seo";

import { prisma } from "@jitaspace/db";
import { FolderIcon } from "@jitaspace/eve-icons";
import { kv } from "@jitaspace/kv";

import { MainLayout } from "~/layouts";

interface PageProps {
  database: {
    name: string;
    count: any;
  }[];
  queues: Record<string, string | number>[];
  vars: Record<string, any>;
}

export const getStaticProps: GetStaticProps<PageProps> = async () => {
  // skip in production
  if (process.env.NODE_ENV === "production") {
    return {
      notFound: true,
    };
  }

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
  };
};

export default function Page({ database, queues, vars }: Readonly<PageProps>) {
  const [activeTab, setActiveTab] = useState("environment");

  return (
    <Container size="md">
      <Stack>
        <Group>
          <FolderIcon width={48} />
          <Title>Local</Title>
        </Group>
        <Tabs
          value={activeTab}
          onChange={(value) => value && setActiveTab(value)}
          keepMounted={false}
        >
          <Tabs.List>
            <Tabs.Tab value="environment">Environment</Tabs.Tab>
            <Tabs.Tab value="queues">Job Queues</Tabs.Tab>
            <Tabs.Tab value="database">Database</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="environment">
            {activeTab === "environment" && (
              <Stack>
                <Group>
                  <FolderIcon width={48} />
                  <Title>Environment Variables</Title>
                </Group>
                {Object.entries(vars).map(([key, value]) => (
                  <Group
                    key={key}
                    justify="space-between"
                    wrap="nowrap"
                    gap="xl"
                  >
                    <div>
                      <Text size="xs">{key}</Text>
                    </div>
                    <div>
                      <Text size="xs">{value}</Text>
                    </div>
                  </Group>
                ))}
              </Stack>
            )}
          </Tabs.Panel>
          <Tabs.Panel value="queues">
            {activeTab === "queues" && (
              <Stack>
                <Group>
                  <FolderIcon width={48} />
                  <Title>Job Queues</Title>
                </Group>
                <Table
                  data={{
                    head: [
                      "name",
                      "paused",
                      "workers",
                      "size",
                      "active",
                      "completed",
                      "failed",
                      "delayed",
                      "waiting",
                    ],
                    body: queues.map((queue) => [
                      queue.name,
                      queue.paused,
                      queue.workers,
                      queue.size,
                      queue.active,
                      queue.completed,
                      queue.failed,
                      queue.delayed,
                      queue.waiting,
                    ]),
                  }}
                />
              </Stack>
            )}
          </Tabs.Panel>
          <Tabs.Panel value="database">
            {activeTab === "database" && (
              <Stack>
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
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Development" />
      {page}
    </MainLayout>
  );
};
