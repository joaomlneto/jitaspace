import React, { useMemo, type ReactElement } from "react";
import {
  Badge,
  ColorSwatch,
  Container,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import useSwr from "swr";

import { useGetStatus as useGetTqStatus } from "@jitaspace/esi-client";
import {
  useGetStatus as useGetMetaStatus,
  type GetStatus200Item,
} from "@jitaspace/esi-meta-client";
import { FormattedDateText } from "@jitaspace/ui";

import { MainLayout } from "~/layouts";

export default function Page() {
  const { data: sdeData, isLoading: sdeIsLoading } = useSwr<{
    lastModified: string;
    date: string;
  }>(
    "/api/sde-last-modified",
    (url: string) => fetch(url).then((res) => res.json()),
    {
      refreshInterval: 60 * 1000,
    },
  );

  const { data: tqClientData, isLoading: tqClientDataIsLoading } = useSwr<{
    date: string | null;
    build: string;
    protected: boolean;
    platforms: string[];
  }>(
    "/api/eveclient-version-tq",
    (url: string) => fetch(url).then((res) => res.json()),
    {
      refreshInterval: 60 * 1000,
    },
  );

  const { data: vercelStatusData, isLoading: vercelStatusIsLoading } = useSwr<{
    page: {
      id: string;
      name: string;
      url: string;
      time_zone: string;
      updated_at: string;
    };
    status: {
      indicator: string;
      description: string;
    };
  }>(
    "/api/vercel-status",
    (url: string) => fetch(url).then((res) => res.json()),
    {
      refreshInterval: 60 * 1000,
    },
  );

  const { data: tqStatus } = useGetTqStatus();

  const { data: esiStatus } = useGetMetaStatus();

  const sdeLastModifiedDate: Date | undefined = sdeData?.lastModified
    ? new Date(sdeData.lastModified)
    : undefined;

  const nonGreenEndpoints = useMemo(
    () => esiStatus?.filter((e) => e.status !== "green") ?? [],
    [esiStatus],
  );

  // group esiStatus object by their tags
  const esiStatusByTag = useMemo(() => {
    const result: Record<string, GetStatus200Item[]> = {};
    Object.values(nonGreenEndpoints ?? {}).forEach((entry) => {
      const tags = entry.tags ?? [];
      tags.forEach((tag) => (result[tag] = [...(result[tag] ?? []), entry]));
    });
    return result;
  }, [nonGreenEndpoints]);

  const sortedEsiStatusTags = useMemo(
    () =>
      Object.keys(esiStatusByTag)
        .slice()
        .sort((a, b) => a.localeCompare(b)),
    [esiStatusByTag],
  );

  return (
    <Container size="sm">
      <Stack>
        <Title>Status</Title>
        <Title order={3}>Jita</Title>
        <Group position="apart">
          <Text>Vercel</Text>
          <Group>
            {vercelStatusIsLoading && "Checking..."}
            {vercelStatusData?.status.description}
          </Group>
        </Group>
        <Group position="apart">
          <Text>SDE API Updated On</Text>
          {/* FIXME: shouldnt be hardcoded! :) */}
          <Text>2023-06-20 09:50:05</Text>
        </Group>
        <Title order={3}>Tranquility</Title>
        <Group position="apart">
          <Text>Players Online</Text>
          <Group>
            {tqStatus?.data.vip && <Badge>VIP Mode</Badge>}
            <Text>{tqStatus?.data.players}</Text>
          </Group>
        </Group>
        <Group position="apart">
          <Text>Start Time</Text>
          <Text>
            {tqStatus && (
              <FormattedDateText date={new Date(tqStatus?.data.start_time)} />
            )}
          </Text>
        </Group>
        <Group position="apart">
          <Text>Server Version</Text>
          <Text>{tqStatus?.data.server_version}</Text>
        </Group>
        <Group position="apart">
          <Text>Client Version</Text>
          <Text>
            {tqClientDataIsLoading && "Checking..."}
            {!tqClientDataIsLoading && tqClientData?.build}
          </Text>
        </Group>
        <Title order={3}>Static Data Export</Title>
        <Group position="apart">
          <Text>Last updated on</Text>
          <Text>
            {sdeIsLoading && "Checking..."}
            {!sdeIsLoading && <FormattedDateText date={sdeLastModifiedDate} />}
          </Text>
        </Group>
        <Title order={3}>EVE Swagger Interface</Title>
        <Group position="apart">
          <Text>Degraded Endpoints</Text>
          <Text>{nonGreenEndpoints?.length}</Text>
        </Group>
        {sortedEsiStatusTags.map((tag) => (
          <div key={tag}>
            <Title order={6}>{tag}</Title>
            <Table verticalSpacing={4} horizontalSpacing={4} fontSize="xs">
              <tbody>
                {esiStatusByTag[tag]?.map((entry) => (
                  <tr key={`${entry.method} ${entry.route}`}>
                    <td width={1}>{entry.method.toUpperCase()}</td>
                    <td>{entry.route}</td>
                    <td align="right">{entry.endpoint}</td>
                    <td align="right" width={1}>
                      <ColorSwatch size={16} color={entry.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ))}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
