import React, { useMemo, useState, type ReactElement } from "react";
import getConfig from "next/config";
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
  Tooltip,
} from "@mantine/core";
import { IconCircleCheck, IconCircleX } from "@tabler/icons-react";
import { NextSeo } from "next-seo";
import useSwr from "swr";

import {
  useGetStatus as useGetMetaStatus,
  type GetStatusQueryResponse,
} from "@jitaspace/esi-meta-client";
import { useServerStatus } from "@jitaspace/hooks";
import { useGetVersion } from "@jitaspace/sde-client";
import { FormattedDateText } from "@jitaspace/ui";

import { EsiClientStateCard } from "~/components/EsiClient";
import { MainLayout } from "~/layouts";


export default function Page() {
  const { publicRuntimeConfig } = getConfig();
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
  const { data: sdeVersionData } = useGetVersion();

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

  const webLastUpdatedDate: Date | null = useMemo(
    () =>
      publicRuntimeConfig?.modifiedDate
        ? new Date(publicRuntimeConfig.modifiedDate)
        : null,
    [publicRuntimeConfig?.modifiedDate],
  );

  const sdeLastModifiedDate: Date | null = useMemo(
    () => (sdeData?.lastModified ? new Date(sdeData.lastModified) : null),
    [sdeData?.lastModified],
  );

  const sdeApiLastUpdatedDate: Date | null = useMemo(
    () =>
      sdeVersionData?.data.generationDate
        ? new Date(sdeVersionData.data.generationDate)
        : null,
    [sdeData?.date],
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
        <Stack gap="xs">
          <Title>Status</Title>
          <Title order={3}>Jita.Space</Title>
          <EsiClientStateCard />
          <Group justify="space-between">
            <Text>Vercel Platform</Text>
            <Group>
              <Anchor href="https://www.vercel-status.com" target="_blank">
                {vercelStatusIsLoading && "Checking..."}
                {vercelStatusData?.status.description}
              </Anchor>
            </Group>
          </Group>
          <Group justify="space-between">
            <Text>Website Updated On</Text>
            {webLastUpdatedDate && (
              <FormattedDateText date={webLastUpdatedDate} />
            )}
          </Group>
          <Group justify="space-between">
            <Text>SDE API Updated On</Text>
            <Group gap="xs">
              <Anchor href="https://sde.jita.space">
                {!sdeApiLastUpdatedDate && "Checking..."}
                {sdeApiLastUpdatedDate && (
                  <FormattedDateText date={sdeApiLastUpdatedDate} />
                )}
              </Anchor>
              {sdeApiLastUpdatedDate &&
              sdeLastModifiedDate &&
              sdeApiLastUpdatedDate >= sdeLastModifiedDate ? (
                <Tooltip label="JitaSpace SDE API is up to date!">
                  <IconCircleCheck color="green" size={16} />
                </Tooltip>
              ) : (
                <Tooltip label="JitaSpace SDE API is outdated!">
                  <IconCircleX color="red" size={16} />
                </Tooltip>
              )}
            </Group>
          </Group>
        </Stack>
        <Stack gap="xs">
          <Title order={3}>EVE Online</Title>
          <Group justify="space-between">
            <Text>Players Online</Text>
            <Group>
              {tqStatus?.data.vip && <Badge>VIP Mode</Badge>}
              <Text>{tqStatus?.data.players.toLocaleString()}</Text>
            </Group>
          </Group>
          <Group justify="space-between">
            <Text>Start Time</Text>
            <Text>
              {tqStatus && (
                <FormattedDateText date={new Date(tqStatus?.data.start_time)} />
              )}
            </Text>
          </Group>
          <Group justify="space-between">
            <Text>Server Version</Text>
            <Text>{tqStatus?.data.server_version}</Text>
          </Group>
          <Group justify="space-between">
            <Text>SDE Last Updated On</Text>
            <Text>
              {sdeIsLoading && "Checking..."}
              {!sdeIsLoading && sdeLastModifiedDate && (
                <FormattedDateText date={sdeLastModifiedDate} />
              )}
            </Text>
          </Group>
          <Group justify="space-between">
            <Text>Degraded ESI Endpoints</Text>
            <Text>
              {nonGreenEndpoints?.length === 0
                ? "None"
                : nonGreenEndpoints.length}
            </Text>
          </Group>
          <Stack gap="xs">
            <Switch
              label="Show all ESI endpoints"
              description="Toggle between showing all ESI endpoints or only those that are degraded"
              checked={showAllEsiEndpoints}
              onChange={(e) => setShowAllEsiEndpoints(e.currentTarget.checked)}
            />

            {sortedEsiStatusTags.map((tag) => (
              <div key={tag}>
                <Title order={6}>{tag}</Title>
                <Table verticalSpacing={4} horizontalSpacing={4} fz="xs">
                  <Table.Tbody>
                    {esiStatusByTag[tag]?.map((entry) => (
                      <Table.Tr key={`${entry.method} ${entry.route}`}>
                        <Table.Td width={1}>
                          {entry.method.toUpperCase()}
                        </Table.Td>
                        <Table.Td>{entry.route}</Table.Td>
                        <Table.Td align="right">{entry.endpoint}</Table.Td>
                        <Table.Td align="right" width={1}>
                          <ColorSwatch size={16} color={entry.status} />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
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
