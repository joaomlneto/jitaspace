import React, { useMemo, useState, type ReactElement } from "react";
import {
  Anchor,
  Badge,
  ColorSwatch,
  Container,
  Group,
  Stack,
  Switch,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { NextSeo } from "next-seo";
import useSwr from "swr";

import {
  useGetStatus as useGetMetaStatus,
  type GetStatusQueryResponse,
} from "@jitaspace/esi-meta-client";
import { useServerStatus } from "@jitaspace/hooks";
import { FormattedDateText } from "@jitaspace/ui";

import { EsiClientStateCard } from "~/components/EsiClient";
import { MainLayout } from "~/layouts";


export default function Page() {
  const [showAllEsiEndpoints, setShowAllEsiEndpoints] =
    useState<boolean>(false);
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

  const { data: tqStatus } = useServerStatus();

  const { data: esiStatus } = useGetMetaStatus(
    {},
    { query: { refetchInterval: 30 * 1000 } },
  );

  const sdeLastModifiedDate: Date | null = useMemo(
    () => (sdeData?.lastModified ? new Date(sdeData.lastModified) : null),
    [sdeData?.lastModified],
  );

  const nonGreenEndpoints = useMemo(
    () => esiStatus?.data.filter((e) => e.status !== "green") ?? [],
    [esiStatus],
  );

  // group esiStatus object by their tags
  const esiStatusByTag = useMemo(() => {
    const result: Record<string, GetStatusQueryResponse> = {};
    (esiStatus?.data ?? [])
      .filter((entry) => showAllEsiEndpoints || entry.status !== "green")
      .forEach((entry) => {
        const tags = entry.tags ?? [];
        tags.forEach((tag) => (result[tag] = [...(result[tag] ?? []), entry]));
      });
    return result;
  }, [esiStatus, showAllEsiEndpoints]);

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
          <Title order={3}>Jita Frontend</Title>
          <EsiClientStateCard />
          <Title order={3}>Jita Backend</Title>
          <Group position="apart">
            <Text>Vercel Platform</Text>
            <Group>
              <Anchor href="https://www.vercel-status.com">
                {vercelStatusIsLoading && "Checking..."}
                {vercelStatusData?.status.description}
              </Anchor>
            </Group>
          </Group>
          <Group position="apart">
            <Text>SDE API Last Updated On</Text>
            {/* FIXME: shouldnt be hardcoded! :) */}
            <Anchor href="https://sde.jita.space">
              <Text>2023-06-20 09:50:05</Text>
            </Anchor>
          </Group>
        </Stack>
        <Stack spacing="xs">
          <Title order={3}>EVE Online</Title>
          <Group position="apart">
            <Text>Players Online</Text>
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
              {!sdeIsLoading && sdeLastModifiedDate && (
                <FormattedDateText date={sdeLastModifiedDate} />
              )}
            </Text>
          </Group>
          <Group position="apart">
            <Text>Degraded ESI Endpoints</Text>
            <Text>
              {nonGreenEndpoints?.length === 0
                ? "None"
                : nonGreenEndpoints.length}
            </Text>
          </Group>
          <Stack spacing="xs">
            <Switch
              label="Show all ESI endpoints"
              description="Toggle between showing all ESI endpoints or only those that are degraded"
              checked={showAllEsiEndpoints}
              onChange={(e) => setShowAllEsiEndpoints(e.currentTarget.checked)}
            />

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
