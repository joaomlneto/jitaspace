"use client";

import { useMemo } from "react";
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
import useSwr from "swr";

import { useGetMetaStatus } from "@jitaspace/esi-client";
import { useServerStatus } from "@jitaspace/hooks";
import { useGetVersion } from "@jitaspace/sde-client";
import { FormattedDateText } from "@jitaspace/ui";

import { EsiStatusDashboard } from "../../components/Status/EsiStatusDashboard";

export default function StatusPage() {
  const { data: sdeData, isLoading: sdeIsLoading } = useSwr<{
    _key: "sde";
    buildNumber: number;
    releaseDate: string;
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

  const { data: tqStatus } = useServerStatus() as any;

  const [opened, { open, close }] = useDisclosure(false);

  const { data: esiStatus } = useGetMetaStatus(
    { "X-Compatibility-Date": "2025-12-16" },
    { query: { refetchInterval: 30 * 1000 } },
  );

  const webLastUpdatedDate: Date | null = useMemo(
    () =>
      process.env.NEXT_PUBLIC_MODIFIED_DATE
        ? new Date(process.env.NEXT_PUBLIC_MODIFIED_DATE)
        : null,
    [],
  );

  const sdeLastModifiedDate: Date | null = useMemo(
    () => (sdeData?.releaseDate ? new Date(sdeData.releaseDate) : null),
    [sdeData?.releaseDate],
  );

  const sdeApiLastUpdatedDate: Date | null = useMemo(
    () =>
      sdeVersionData?.data.generationDate
        ? new Date(sdeVersionData.data.generationDate)
        : null,
    [sdeVersionData?.data.generationDate],
  );

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
                    {vercelStatusIsLoading && <Loader size="xs" />}
                    {vercelStatusData?.status.description}
                  </Anchor>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Website Updated On
                  </Text>
                  {webLastUpdatedDate && (
                    <FormattedDateText
                      date={webLastUpdatedDate}
                      size="sm"
                      span
                    />
                  )}
                </Group>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    SDE API Updated On
                  </Text>
                  <Group gap="xs">
                    <Anchor href="https://sde.jita.space" size="sm">
                      {!sdeApiLastUpdatedDate && <Loader size="xs" />}
                      {sdeApiLastUpdatedDate && (
                        <FormattedDateText date={sdeApiLastUpdatedDate} />
                      )}
                    </Anchor>
                    {sdeApiLastUpdatedDate &&
                      sdeLastModifiedDate &&
                      (sdeApiLastUpdatedDate >= sdeLastModifiedDate ? (
                        <Tooltip label="JitaSpace SDE API is up to date!">
                          <IconCircleCheck color="green" size={14} />
                        </Tooltip>
                      ) : (
                        <Tooltip label="JitaSpace SDE API is outdated!">
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
                    <FormattedDateText
                      date={new Date(tqStatus?.data.start_time)}
                      size="sm"
                    />
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
                  {sdeIsLoading ? (
                    <Loader size="xs" />
                  ) : (
                    sdeLastModifiedDate && (
                      <FormattedDateText date={sdeLastModifiedDate} size="sm" />
                    )
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
                {!esiStatus ? (
                  <Loader size="sm" />
                ) : (
                  <Badge
                    color={nonOkEndpointsCount === 0 ? "green" : "yellow"}
                    variant="light"
                  >
                    {nonOkEndpointsCount === 0
                      ? "All Systems Operational"
                      : "Partial Degradation"}
                  </Badge>
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
