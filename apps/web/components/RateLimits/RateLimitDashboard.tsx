"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Card,
  Container,
  Divider,
  Group,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconClock, IconCloud, IconLink } from "@tabler/icons-react";
import humanizeDuration from "humanize-duration";

import { useEsiRateLimitSchema } from "~/lib/useEsiRateLimitSchema";
import { useEsiRateLimitState } from "~/lib/useEsiRateLimitState";

const formatDuration = (ms?: number) => {
  if (!ms || ms <= 0) return "0s";
  return humanizeDuration(ms, { largest: 2, round: true });
};

const formatTimestamp = (value?: number) => {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString();
};

const formatNumber = (value: number) => value.toLocaleString();

const StatCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <Paper withBorder radius="md" p="md">
    <Text size="xs" c="dimmed" tt="uppercase">
      {label}
    </Text>
    <Group gap="xs" align="baseline">
      <Text size="xl" fw={700}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Group>
  </Paper>
);

export default function RateLimitDashboard() {
  const schema = useEsiRateLimitSchema({});
  const state = useEsiRateLimitState({
    refreshMs: 1000,
  });
  const [routeFilter, setRouteFilter] = useState("");

  const sortedRoutes = useMemo(
    () =>
      [...schema.routes].sort((a, b) => a.routeKey.localeCompare(b.routeKey)),
    [schema.routes],
  );

  const filteredRoutes = useMemo(() => {
    if (!routeFilter.trim()) return sortedRoutes;
    const query = routeFilter.trim().toLowerCase();
    return sortedRoutes.filter(
      (route) =>
        route.routeKey.toLowerCase().includes(query) ||
        route.group.toLowerCase().includes(query) ||
        route.path.toLowerCase().includes(query),
    );
  }, [routeFilter, sortedRoutes]);

  const sortedGroups = useMemo(
    () => [...schema.groups].sort((a, b) => a.group.localeCompare(b.group)),
    [schema.groups],
  );

  const averageWaitMs =
    state.totalWaits > 0 ? state.totalWaitMs / state.totalWaits : 0;
  const successRate =
    state.totalCompleted > 0
      ? Math.round((state.totalSucceeded / state.totalCompleted) * 100)
      : 0;

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Title order={1}>ESI Rate Limit Dashboard</Title>
            <Text c="dimmed" size="sm">
              Live client buckets and schema-based group configuration.
            </Text>
          </Stack>
          <Group gap="sm">
            <Badge variant="light" leftSection={<IconLink size={12} />}>
              {schema.routes.length} routes
            </Badge>
            <Badge variant="light" leftSection={<IconCloud size={12} />}>
              {state.buckets.length} buckets
            </Badge>
          </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <StatCard
            label="In Flight"
            value={formatNumber(state.inFlight)}
            hint="active requests"
          />
          <StatCard
            label="Waiting"
            value={formatNumber(state.waiting)}
            hint={`${formatDuration(averageWaitMs)} avg wait`}
          />
          <StatCard
            label="Success Rate"
            value={`${successRate}%`}
            hint={`${formatNumber(state.totalSucceeded)} ok`}
          />
          <StatCard
            label="Total Requests"
            value={formatNumber(state.totalRequests)}
            hint={`${formatNumber(state.totalCompleted)} completed`}
          />
          <StatCard
            label="Local 429s"
            value={formatNumber(state.localLimitHits)}
            hint="client throttles"
          />
          <StatCard
            label="Server 429s"
            value={formatNumber(state.serverLimitHits)}
            hint="ESI throttles"
          />
          <StatCard
            label="Last Request"
            value={formatTimestamp(state.lastRequestAt)}
            hint={`last response ${formatTimestamp(state.lastResponseAt)}`}
          />
          <StatCard
            label="Max Wait"
            value={formatDuration(state.maxWaitMs)}
            hint={`${formatNumber(state.totalWaits)} waits`}
          />
        </SimpleGrid>

        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" align="center" mb="md">
            <Stack gap={2}>
              <Title order={3}>Active Buckets</Title>
              <Text size="xs" c="dimmed">
                Buckets are scoped by rate limit group and user identity.
              </Text>
            </Stack>
            <Badge variant="outline">
              {formatNumber(state.buckets.length)} active
            </Badge>
          </Group>
          {state.buckets.length === 0 ? (
            <Text c="dimmed" size="sm">
              No buckets recorded yet. Trigger a few ESI requests to populate
              this list.
            </Text>
          ) : (
            <ScrollArea h={320}>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Group</Table.Th>
                    <Table.Th>User</Table.Th>
                    <Table.Th>Tokens</Table.Th>
                    <Table.Th>Next Free</Table.Th>
                    <Table.Th>Window</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {state.buckets.map((bucket) => {
                    const usagePercent =
                      bucket.effectiveMaxTokens > 0
                        ? (bucket.usedTokens / bucket.effectiveMaxTokens) * 100
                        : 0;
                    return (
                      <Table.Tr key={bucket.key}>
                        <Table.Td>
                          <Text fw={600} size="sm">
                            {bucket.group}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Tooltip label={bucket.userKey}>
                            <Text size="sm" lineClamp={1}>
                              {bucket.userKey}
                            </Text>
                          </Tooltip>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={4}>
                            <Text size="sm">
                              {bucket.usedTokens}/{bucket.effectiveMaxTokens}
                            </Text>
                            <Progress
                              value={Math.min(usagePercent, 100)}
                              size="sm"
                            />
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={6}>
                            <IconClock size={14} />
                            <Text size="sm">
                              {bucket.nextFreeInMs > 0
                                ? formatDuration(bucket.nextFreeInMs)
                                : "ready"}
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {formatDuration(bucket.windowMs)}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Paper>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Stack gap={2}>
                <Title order={3}>Schema Configuration</Title>
                <Text size="xs" c="dimmed">
                  Loaded from {schema.sourceUrl}
                </Text>
                {schema.fetchedAt && (
                  <Text size="xs" c="dimmed">
                    Fetched at {formatTimestamp(schema.fetchedAt)}
                  </Text>
                )}
              </Stack>
              <Group gap="xs">
                {schema.specTitle && <Badge>{schema.specTitle}</Badge>}
                {schema.specVersion && (
                  <Badge variant="outline">v{schema.specVersion}</Badge>
                )}
              </Group>
            </Group>

            {schema.error && (
              <Text c="red" size="sm">
                {schema.error}
              </Text>
            )}

            {schema.isLoading ? (
              <Text c="dimmed" size="sm">
                Loading rate limit metadata from OpenAPI...
              </Text>
            ) : (
              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  <Paper withBorder radius="md" p="md">
                    <Text size="sm" c="dimmed">
                      Schema groups
                    </Text>
                    <Text size="xl" fw={700}>
                      {formatNumber(schema.groups.length)}
                    </Text>
                  </Paper>
                  <Paper withBorder radius="md" p="md">
                    <Text size="sm" c="dimmed">
                      Rate-limited routes
                    </Text>
                    <Text size="xl" fw={700}>
                      {formatNumber(schema.routes.length)}
                    </Text>
                  </Paper>
                </SimpleGrid>

                <Divider />

                <Title order={4}>Groups</Title>
                <ScrollArea h={260}>
                  <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Group</Table.Th>
                        <Table.Th>Window</Table.Th>
                        <Table.Th>Max Tokens</Table.Th>
                        <Table.Th>Routes</Table.Th>
                        <Table.Th>Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {sortedGroups.map((group) => (
                        <Table.Tr key={group.group}>
                          <Table.Td>
                            <Text fw={600} size="sm">
                              {group.group}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {formatDuration(group.windowMs)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {formatNumber(group.maxTokens)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {formatNumber(group.routeCount)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            {group.inconsistent ? (
                              <Badge color="yellow" variant="light">
                                mismatch
                              </Badge>
                            ) : (
                              <Badge color="green" variant="light">
                                ok
                              </Badge>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                <Divider />

                <Group justify="space-between" align="center">
                  <Title order={4}>Routes</Title>
                  <TextInput
                    placeholder="Filter by group or path"
                    value={routeFilter}
                    onChange={(event) => setRouteFilter(event.target.value)}
                  />
                </Group>
                <ScrollArea h={320}>
                  <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Method</Table.Th>
                        <Table.Th>Path</Table.Th>
                        <Table.Th>Group</Table.Th>
                        <Table.Th>Window</Table.Th>
                        <Table.Th>Max Tokens</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredRoutes.map((route) => (
                        <Table.Tr key={route.routeKey}>
                          <Table.Td>
                            <Badge variant="light">{route.method}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{route.path}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" fw={600}>
                              {route.group}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {formatDuration(route.windowMs)}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {formatNumber(route.maxTokens)}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Stack>
            )}
          </Stack>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Stack gap={2}>
                <Title order={3}>Observed Groups</Title>
                <Text size="xs" c="dimmed">
                  Groups learned from schema, headers, or explicit config.
                </Text>
              </Stack>
              <Badge variant="outline">
                {formatNumber(state.groups.length)} groups
              </Badge>
            </Group>
            {state.groups.length === 0 ? (
              <Text c="dimmed" size="sm">
                No runtime groups registered yet. Schema load or first responses
                will populate this list.
              </Text>
            ) : (
              <ScrollArea h={240}>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Group</Table.Th>
                      <Table.Th>Window</Table.Th>
                      <Table.Th>Max Tokens</Table.Th>
                      <Table.Th>Source</Table.Th>
                      <Table.Th>Updated</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {state.groups.map((group) => (
                      <Table.Tr key={group.group}>
                        <Table.Td>
                          <Text fw={600} size="sm">
                            {group.group}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {formatDuration(group.windowMs)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatNumber(group.maxTokens)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light">{group.source}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {formatTimestamp(group.updatedAt)}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
