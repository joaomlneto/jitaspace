"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ActionIcon,
  Anchor,
  Badge,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconActivity,
  IconCircleCheck,
  IconCircleX,
} from "@tabler/icons-react";

import {
  getRateLimitBuildDate,
  useGetMetaCompatibilityDates,
  useGetMetaStatus,
} from "@jitaspace/esi-client";
import { useServerStatus } from "@jitaspace/hooks";
import { DateHoverCard, FormattedDateText } from "@jitaspace/ui";

import type { SdeIngestState } from "./actions";
import type { SdeLastModifiedResponse, VercelStatusResponse } from "./types";
import { env } from "~/env";
import { DatabaseDashboard } from "../../components/Status/DatabaseDashboard";
import { EsiRateLimitDashboard } from "../../components/Status/EsiRateLimitDashboard";
import { EsiStatusDashboard } from "../../components/Status/EsiStatusDashboard";
import { TriggerJobsDashboard } from "../../components/Status/TriggerJobsDashboard";

export interface PageProps {
  vercelStatusData: VercelStatusResponse | null;
  sdeLastModifiedData: SdeLastModifiedResponse | null;
  /**
   * The SDE build currently ingested into our database, recorded by the
   * `ingest-sde-all` pipeline. Null when nothing has been ingested yet or Redis
   * is unreachable.
   */
  sdeIngestState: SdeIngestState | null;
}

export default function StatusPage({
  vercelStatusData,
  sdeLastModifiedData,
  sdeIngestState,
}: Readonly<PageProps>) {
  const { data: tqStatus } = useServerStatus();

  const [opened, { open, close }] = useDisclosure(false);

  // Headers are omitted so the client falls back to the compatibility date the
  // ESI client was generated against, rather than pinning a copy that silently
  // goes stale whenever that date is bumped.
  const { data: esiStatus } = useGetMetaStatus(undefined, {
    query: { refetchInterval: 30 * 1000 },
  });

  const webLastUpdatedDate: Date | null = useMemo(
    () =>
      env.NEXT_PUBLIC_MODIFIED_DATE
        ? new Date(env.NEXT_PUBLIC_MODIFIED_DATE)
        : null,
    [],
  );

  const sdeLastModifiedDate: Date | null = useMemo(
    () =>
      sdeLastModifiedData?.releaseDate
        ? new Date(sdeLastModifiedData.releaseDate)
        : null,
    [sdeLastModifiedData],
  );

  // Read off plain values before memoizing: the React Compiler can't match an
  // optional-chained expression in a dependency array against what it infers.
  const sdeIngestedAt = sdeIngestState?.completedAt ?? null;
  const ourSdeBuild = sdeIngestState?.buildNumber;
  const latestSdeBuild = sdeLastModifiedData?.buildNumber;

  const sdeIngestedDate: Date | null = useMemo(
    () => (sdeIngestedAt ? new Date(sdeIngestedAt) : null),
    [sdeIngestedAt],
  );

  // Freshness is a build-number comparison, not a date one: the marker records
  // which CCP build we loaded, and CCP's `releaseDate` is when that build was
  // published — always earlier than when we finished ingesting it.
  const sdeIsCurrent: boolean | null = useMemo(() => {
    if (ourSdeBuild === undefined || latestSdeBuild === undefined) return null;
    return ourSdeBuild >= latestSdeBuild;
  }, [ourSdeBuild, latestSdeBuild]);

  const buildDate = useMemo(() => getRateLimitBuildDate(), []);

  const { data: compatibilityDatesData } = useGetMetaCompatibilityDates();

  const latestCompatibilityDate = useMemo(() => {
    const dates = compatibilityDatesData?.data.compatibility_dates;
    if (!dates?.length) return null;
    return [...dates].sort((a, b) => a.localeCompare(b)).at(-1) ?? null;
  }, [compatibilityDatesData]);

  const nonOkEndpointsCount = useMemo(
    () => esiStatus?.data.routes.filter((e) => e.status !== "OK").length ?? 0,
    [esiStatus],
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Title order={1}>Server Status</Title>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {/* JitaSpace Section */}
          <Card withBorder padding="lg" shadow="sm" radius="md">
            <Stack gap="md">
              <Title order={3}>JitaSpace</Title>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Vercel Platform
                  </Text>
                  <Anchor
                    href="https://www.vercel-status.com"
                    target="_blank"
                    size="sm"
                  >
                    {vercelStatusData?.status.description ?? "Unknown"}
                  </Anchor>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Website Updated On
                  </Text>
                  <Anchor component={Link} href="/changelog" size="sm">
                    {webLastUpdatedDate && (
                      <FormattedDateText
                        date={webLastUpdatedDate}
                        size="sm"
                        span
                      />
                    )}
                  </Anchor>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    ESI Compatibility Date
                  </Text>
                  <Group gap="xs">
                    <Text size="sm">{buildDate || "-"}</Text>
                    {buildDate &&
                      latestCompatibilityDate &&
                      (buildDate >= latestCompatibilityDate ? (
                        <Tooltip label="ESI compatibility date is up to date!">
                          <IconCircleCheck color="green" size={14} />
                        </Tooltip>
                      ) : (
                        <Tooltip
                          label={`ESI compatibility date is outdated! Latest: ${latestCompatibilityDate}`}
                        >
                          <IconCircleX color="red" size={14} />
                        </Tooltip>
                      ))}
                  </Group>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    SDE Ingested On
                  </Text>
                  <Group gap="xs">
                    {!sdeIngestedDate && (
                      <Text size="sm">
                        {sdeIngestState ? "In progress…" : "—"}
                      </Text>
                    )}
                    {sdeIngestedDate && (
                      <DateHoverCard date={sdeIngestedDate}>
                        <FormattedDateText date={sdeIngestedDate} size="sm" />
                      </DateHoverCard>
                    )}
                    {sdeIsCurrent !== null &&
                      (sdeIsCurrent ? (
                        <Tooltip
                          label={`Our SDE data is up to date (build ${ourSdeBuild})`}
                        >
                          <IconCircleCheck color="green" size={14} />
                        </Tooltip>
                      ) : (
                        <Tooltip
                          label={`Our SDE data is outdated (build ${ourSdeBuild}, latest ${latestSdeBuild})`}
                        >
                          <IconCircleX color="red" size={14} />
                        </Tooltip>
                      ))}
                  </Group>
                </Group>
              </Stack>
            </Stack>
          </Card>

          {/* Tranquility Section */}
          <Card withBorder padding="lg" shadow="sm" radius="md">
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <Title order={3}>Tranquility</Title>
                {tqStatus ? (
                  <Badge color="green" variant="light">
                    Online
                  </Badge>
                ) : (
                  <Badge color="red" variant="light">
                    Offline
                  </Badge>
                )}
              </Group>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Players Online
                  </Text>
                  <Group gap="xs">
                    {tqStatus?.data.vip && <Badge size="xs">VIP Mode</Badge>}
                    <Text size="sm" fw={700}>
                      {tqStatus?.data.players.toLocaleString() ?? "-"}
                    </Text>
                  </Group>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Start Time
                  </Text>
                  {tqStatus && (
                    <DateHoverCard date={new Date(tqStatus.data.start_time)}>
                      <FormattedDateText
                        date={new Date(tqStatus.data.start_time)}
                        size="sm"
                      />
                    </DateHoverCard>
                  )}
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Server Version
                  </Text>
                  <Text size="sm" fw={700}>
                    {tqStatus?.data.server_version ?? "-"}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    SDE Last Updated On
                  </Text>
                  {sdeLastModifiedDate && (
                    <DateHoverCard date={sdeLastModifiedDate}>
                      <FormattedDateText date={sdeLastModifiedDate} size="sm" />
                    </DateHoverCard>
                  )}
                </Group>
              </Stack>
            </Stack>
          </Card>

          {/* ESI API Summary Section */}
          <Card withBorder padding="lg" shadow="sm" radius="md">
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <Group gap="xs">
                  <Title order={3}>ESI API</Title>
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={open}
                    title="View detailed status"
                  >
                    <IconActivity size={20} />
                  </ActionIcon>
                </Group>
                {esiStatus ? (
                  <Badge
                    color={nonOkEndpointsCount === 0 ? "green" : "yellow"}
                    variant="light"
                  >
                    {nonOkEndpointsCount === 0
                      ? "All Systems Operational"
                      : "Partial Degradation"}
                  </Badge>
                ) : (
                  <Loader size="sm" />
                )}
              </Group>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Degraded Endpoints
                  </Text>
                  <Text
                    size="sm"
                    fw={700}
                    c={nonOkEndpointsCount > 0 ? "orange" : "green"}
                  >
                    {nonOkEndpointsCount === 0 ? "None" : nonOkEndpointsCount}
                  </Text>
                </Group>
                <Text size="xs" c="dimmed">
                  Click the activity icon to see the detailed status of
                  individual endpoints.
                </Text>
              </Stack>
            </Stack>
          </Card>
        </SimpleGrid>

        <TriggerJobsDashboard />

        <DatabaseDashboard />

        <EsiRateLimitDashboard />
      </Stack>

      <Modal
        opened={opened}
        onClose={close}
        title="ESI API Status Dashboard"
        size="xl"
      >
        <EsiStatusDashboard />
      </Modal>
    </Container>
  );
}
