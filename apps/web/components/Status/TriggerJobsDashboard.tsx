"use client";

import { useMemo } from "react";
import {
  Alert,
  Badge,
  ColorSwatch,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { TimeAgoText } from "@jitaspace/ui";

import type {
  TriggerJobStatus,
  TriggerRunStatus,
  TriggerRunSummary,
} from "~/lib/triggerStatus";
import { getTriggerStatus } from "~/app/status/actions";

const STATUS_COLORS: Record<TriggerRunStatus, string> = {
  Running: "blue",
  Completed: "green",
  Failed: "red",
  Cancelled: "gray",
};

const formatDuration = (ms: number | null) => {
  if (ms === null || ms < 0) return "-";
  if (ms < 1000) return "<1s";

  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const runTimestamp = (run: TriggerRunSummary) => run.endedAt ?? run.queuedAt;

const runTooltip = (run: TriggerRunSummary) => {
  const timestamp = runTimestamp(run);
  const parts: string[] = [run.status];
  if (run.durationMs !== null)
    parts.push(`in ${formatDuration(run.durationMs)}`);
  if (timestamp) parts.push(`· ${new Date(timestamp).toLocaleString()}`);
  return parts.join(" ");
};

/** Jobs whose latest run failed sort first, then by most recent activity. */
const jobPriority = (job: TriggerJobStatus) =>
  job.lastRun?.status === "Failed" ? 0 : 1;

export function TriggerJobsDashboard() {
  const { data, error, isLoading } = useQuery({
    // Data comes from a server function (app/status/actions.ts), not a
    // public route — React Query invokes it like any async function.
    queryKey: ["trigger-status"],
    queryFn: () => getTriggerStatus(),
    refetchInterval: 30 * 1000,
  });

  const sortedJobs = useMemo(() => {
    if (!data) return [];
    return [...data.jobs].sort((a, b) => {
      const priorityDelta = jobPriority(a) - jobPriority(b);
      if (priorityDelta !== 0) return priorityDelta;
      const aTimestamp = a.lastRun ? (runTimestamp(a.lastRun) ?? 0) : 0;
      const bTimestamp = b.lastRun ? (runTimestamp(b.lastRun) ?? 0) : 0;
      if (aTimestamp !== bTimestamp) return bTimestamp - aTimestamp;
      return a.name.localeCompare(b.name);
    });
  }, [data]);

  const overallBadge = useMemo(() => {
    if (!data || data.error) return null;
    if (data.totals.failed > 0) {
      return {
        color: "red",
        label: `${data.totals.failed} Failed Run${data.totals.failed === 1 ? "" : "s"}`,
      };
    }
    if (data.totals.runs === 0) {
      return { color: "gray", label: "No Recent Runs" };
    }
    if (data.totals.running > 0) {
      return {
        color: "blue",
        label: `${data.totals.running} Running`,
      };
    }
    return { color: "green", label: "All Jobs Healthy" };
  }, [data]);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <Stack gap={0}>
          <Title order={3}>Background Jobs (Trigger.dev)</Title>
          <Text size="xs" c="dimmed">
            Trigger.dev task runs over the last {data?.windowHours ?? 24} hours
            · tasks with no recent runs are not listed
          </Text>
        </Stack>
        {overallBadge && (
          <Badge color={overallBadge.color} variant="light">
            {overallBadge.label}
          </Badge>
        )}
      </Group>

      {isLoading && (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      )}

      {error && (
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          color="red"
          variant="light"
        >
          Failed to load Trigger.dev job status: {error.message}
        </Alert>
      )}

      {data?.error && (
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          color="yellow"
          variant="light"
        >
          Trigger.dev job status is currently unavailable: {data.error}
        </Alert>
      )}

      {data && !data.error && (
        <>
          {sortedJobs.length === 0 ? (
            <Alert
              icon={<IconAlertCircle size="1rem" />}
              color="gray"
              variant="light"
            >
              No task runs in the last {data.windowHours} hours.
            </Alert>
          ) : (
            <ScrollArea>
              <Table
                withTableBorder
                striped
                highlightOnHover
                verticalSpacing="xs"
                fz="sm"
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Job</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Last Run</Table.Th>
                    <Table.Th ta="right">Duration</Table.Th>
                    <Table.Th ta="right">Runs</Table.Th>
                    <Table.Th>History</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sortedJobs.map((job) => {
                    const lastRun = job.lastRun;
                    const lastRunTimestamp = lastRun
                      ? runTimestamp(lastRun)
                      : null;
                    const status = lastRun?.status ?? "Completed";

                    return (
                      <Table.Tr key={job.id}>
                        <Table.Td>
                          <Text size="sm" fw={600}>
                            {job.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {job.id}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={STATUS_COLORS[status]} variant="light">
                            {status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {lastRunTimestamp ? (
                            <Tooltip
                              label={new Date(
                                lastRunTimestamp,
                              ).toLocaleString()}
                              withArrow
                            >
                              <TimeAgoText
                                date={new Date(lastRunTimestamp)}
                                addSuffix
                                size="sm"
                                span
                              />
                            </Tooltip>
                          ) : (
                            <Text size="sm" c="dimmed">
                              -
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" span>
                            {formatDuration(lastRun?.durationMs ?? null)}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" span>
                            {job.counts.total.toLocaleString()}
                          </Text>
                          {job.counts.failed > 0 && (
                            <Text size="xs" c="red" span>
                              {" "}
                              ({job.counts.failed.toLocaleString()} failed)
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {job.recentRuns.length > 0 ? (
                            <Group gap={4} wrap="nowrap">
                              {[...job.recentRuns].reverse().map((run) => (
                                <Tooltip
                                  key={run.runId}
                                  label={runTooltip(run)}
                                  withArrow
                                >
                                  <ColorSwatch
                                    size={10}
                                    color={`var(--mantine-color-${STATUS_COLORS[run.status]}-6)`}
                                  />
                                </Tooltip>
                              ))}
                            </Group>
                          ) : (
                            <Text size="xs" c="dimmed">
                              -
                            </Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}

          <Text size="xs" c="dimmed">
            Updated {new Date(data.fetchedAt).toLocaleTimeString()} · refreshes
            every 30 seconds
          </Text>
        </>
      )}
    </Stack>
  );
}
