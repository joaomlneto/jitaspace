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
import { NextSeo } from "next-seo";
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

  const { data: tqStatus } = useGetTqStatus(
    {},
    {
      swr: {
        refreshInterval: 10 * 1000,
      },
    },
  );

  const { data: esiStatus } = useGetMetaStatus(
    {},
    { query: { refetchInterval: 30 * 1000 } },
  );

  const sdeLastModifiedDate: Date | undefined = useMemo(
    () => (sdeData?.lastModified ? new Date(sdeData.lastModified) : undefined),
    [sdeData?.lastModified],
  );

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
        <Stack spacing="xs">
          <Title>Status</Title>
          <Title order={3}>Jita</Title>
          <Group position="apart">
            <Text>Vercel Platform</Text>
            <Group>
              {vercelStatusIsLoading && "Checking..."}
              {vercelStatusData?.status.description}
            </Group>
          </Group>
          <Group position="apart">
            <Text>SDE API Last Updated On</Text>
            {/* FIXME: shouldnt be hardcoded! :) */}
            <Text>2023-06-20 09:50:05</Text>
          </Group>
        </Stack>
        <Stack spacing="xs">
          <Title order={3}>EVE Online</Title>
          <Group position="apart">
            <Text>Tranquility - Players Online</Text>
            <Group>
              {tqStatus?.data.vip && <Badge>VIP Mode</Badge>}
              <Text>{tqStatus?.data.players.toLocaleString()}</Text>
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
            <Text>SDE Last Updated On</Text>
            <Text>
              {sdeIsLoading && "Checking..."}
              {!sdeIsLoading && (
                <FormattedDateText date={sdeLastModifiedDate} />
              )}
            </Text>
          </Group>
          <Group position="apart">
            <Text>ESI Degraded Endpoints</Text>
            <Text>
              {nonGreenEndpoints?.length === 0
                ? "None"
                : nonGreenEndpoints.length}
            </Text>
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
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return (
    <MainLayout>
      <NextSeo title="Status" />
      {page}
    </MainLayout>
  );
};
