"use client";

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

import { FolderIcon } from "@jitaspace/eve-icons";


export interface PageProps {
  database: {
    name: string;
    count: any;
  }[];
  queues: Record<string, string | number>[];
  vars: Record<string, any>;
}

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
