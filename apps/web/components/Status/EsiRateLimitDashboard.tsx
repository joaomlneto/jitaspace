"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkline } from "@mantine/charts";
import {
  Alert,
  Badge,
  Group,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

import {
  DEFAULT_RATE_LIMIT_USER_ID,
  getAllRateLimitGroups,
  getRateLimitBucketConfigs,
  getRateLimitBuildDate,
  getRateLimitRequestHistoryWindowSeconds,
  getWaitTime,
  useEsiRateLimit,
} from "@jitaspace/esi-client";
import { useAuthStore } from "@jitaspace/hooks";
import { CharacterAvatar } from "@jitaspace/ui";

const formatWindow = (windowSeconds: number) => {
  if (windowSeconds <= 0) return "-";
  if (windowSeconds % 3600 === 0) return `${windowSeconds / 3600}h`;
  if (windowSeconds % 60 === 0) return `${windowSeconds / 60}m`;
  return `${windowSeconds}s`;
};

const formatDuration = (ms: number | null) => {
  if (!ms || ms <= 0) return "0s";

  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const getBucketStatus = (limit: number, remaining: number) => {
  if (limit <= 0) {
    return { label: "Unknown", color: "gray" };
  }

  const remainingPercent = (remaining / limit) * 100;
  if (remaining <= 0) return { label: "Exhausted", color: "red" };
  if (remainingPercent < 20) return { label: "Critical", color: "red" };
  if (remainingPercent < 50) return { label: "Warning", color: "yellow" };
  return { label: "Healthy", color: "green" };
};

const isAnonymousRateLimitUser = (userId: string) => {
  return (
    userId === DEFAULT_RATE_LIMIT_USER_ID ||
    userId.startsWith(`${DEFAULT_RATE_LIMIT_USER_ID}:`) ||
    userId === "-"
  );
};

const getCharacterIdFromRateLimitUserId = (userId: string): number | null => {
  if (isAnonymousRateLimitUser(userId)) {
    return null;
  }

  const userIdSegments = userId.split(":");
  const maybeCharacterId = userIdSegments[userIdSegments.length - 1];

  if (!maybeCharacterId || !/^\d+$/.test(maybeCharacterId)) {
    return null;
  }

  return Number(maybeCharacterId);
};

export function EsiRateLimitDashboard() {
  const rateLimitState = useEsiRateLimit();
  const { characters } = useAuthStore();
  const [now, setNow] = useState(() => Date.now());

  const characterNamesById = useMemo(() => {
    return Object.values(characters).reduce<Record<number, string>>(
      (result, character) => {
        result[character.characterId] = character.accessTokenPayload.name;
        return result;
      },
      {},
    );
  }, [characters]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const buildDate = useMemo(() => getRateLimitBuildDate(), []);
  const bucketConfigs = useMemo(() => getRateLimitBucketConfigs(), []);
  const requestHistoryWindowSeconds = useMemo(
    () => getRateLimitRequestHistoryWindowSeconds(),
    [],
  );
  const timelineMinutePoints = Math.max(
    1,
    Math.ceil(requestHistoryWindowSeconds / 60),
  );

  const buckets = useMemo(() => {
    const stateBuckets = Object.values(rateLimitState);

    const bucketsWithState = stateBuckets.map((state) => {
      const config = bucketConfigs[state.group];
      const limit = state.limit;
      const remaining = Math.max(0, state.remaining);
      const windowSeconds = state.windowSeconds;
      const consumedTokens = state.consumedTokens;
      const requestHistory = state.requestHistory ?? [];
      const usedTokensInWindow = requestHistory.reduce(
        (total, requestEntry) => total + requestEntry.tokenCost,
        0,
      );
      const tokensUsedTimeline = new Array<number>(timelineMinutePoints).fill(
        0,
      );
      const timelineWindowMs = timelineMinutePoints * 60 * 1000;
      const timelineStart = now - timelineWindowMs;

      for (const requestEntry of requestHistory) {
        const minuteIndex = Math.floor(
          (requestEntry.timestamp - timelineStart) / 60000,
        );

        if (minuteIndex >= 0 && minuteIndex < timelineMinutePoints) {
          tokensUsedTimeline[minuteIndex] =
            (tokensUsedTimeline[minuteIndex] ?? 0) + requestEntry.tokenCost;
        }
      }

      const activeTokenEntries = consumedTokens.length;
      const utilizationPercent =
        limit > 0
          ? Math.min(100, Math.max(0, ((limit - remaining) / limit) * 100))
          : 0;
      const availabilityPercent = limit > 0 ? (remaining / limit) * 100 : 0;
      const isAnonymousUser = isAnonymousRateLimitUser(state.userId);
      const characterId = getCharacterIdFromRateLimitUserId(state.userId);
      const characterName =
        characterId != null ? characterNamesById[characterId] : undefined;

      const nextResetAt =
        consumedTokens.length > 0 && windowSeconds > 0
          ? Math.min(
              ...consumedTokens.map(
                (token) => token.timestamp + windowSeconds * 1000,
              ),
            )
          : null;
      const nextResetInMs = nextResetAt ? Math.max(0, nextResetAt - now) : null;

      return {
        bucketKey: state.bucketKey,
        group: state.group,
        userId: state.userId,
        limit,
        remaining,
        windowSeconds,
        activeTokenEntries,
        usedTokensInWindow,
        tokensUsedTimeline,
        utilizationPercent,
        availabilityPercent,
        waitForTwoTokensMs: getWaitTime(state.group, 2, state.userId),
        nextResetInMs,
        routeCount: config?.routeCount ?? 0,
        routeMatchers: config?.routeMatchers ?? [],
        isAnonymousUser,
        characterId,
        characterName,
      };
    });

    const groupsWithState = new Set(stateBuckets.map((state) => state.group));
    const placeholderBuckets = Array.from(
      new Set([...getAllRateLimitGroups(), ...Object.keys(bucketConfigs)]),
    )
      .filter((group) => !groupsWithState.has(group))
      .map((group) => {
        const config = bucketConfigs[group];
        const limit = config?.maxTokens ?? 0;
        const remaining = Math.max(0, config?.maxTokens ?? 0);
        const availabilityPercent = limit > 0 ? (remaining / limit) * 100 : 0;

        return {
          bucketKey: `${group}:unknown-user`,
          group,
          userId: "-",
          limit,
          remaining,
          windowSeconds: config?.windowSeconds ?? 0,
          activeTokenEntries: 0,
          usedTokensInWindow: 0,
          tokensUsedTimeline: new Array<number>(timelineMinutePoints).fill(0),
          utilizationPercent: 0,
          availabilityPercent,
          waitForTwoTokensMs: 0,
          nextResetInMs: null,
          routeCount: config?.routeCount ?? 0,
          routeMatchers: config?.routeMatchers ?? [],
          isAnonymousUser: true,
          characterId: null,
          characterName: undefined,
        };
      });

    return [...bucketsWithState, ...placeholderBuckets].sort((a, b) => {
      if (a.availabilityPercent !== b.availabilityPercent) {
        return a.availabilityPercent - b.availabilityPercent;
      }

      const groupCompare = a.group.localeCompare(b.group);
      if (groupCompare !== 0) {
        return groupCompare;
      }

      return a.userId.localeCompare(b.userId);
    });
  }, [
    bucketConfigs,
    characterNamesById,
    now,
    rateLimitState,
    timelineMinutePoints,
  ]);

  const summary = useMemo(() => {
    const totalBuckets = buckets.length;
    const totalLimit = buckets.reduce(
      (total, bucket) => total + bucket.limit,
      0,
    );
    const totalRemaining = buckets.reduce(
      (total, bucket) => total + bucket.remaining,
      0,
    );
    const activeBuckets = buckets.filter(
      (bucket) => bucket.activeTokenEntries > 0,
    ).length;
    const stressedBuckets = buckets.filter(
      (bucket) => bucket.limit > 0 && bucket.availabilityPercent < 50,
    ).length;
    const criticalBuckets = buckets.filter(
      (bucket) => bucket.limit > 0 && bucket.availabilityPercent < 20,
    ).length;
    const nearestResetMs = buckets
      .map((bucket) => bucket.nextResetInMs)
      .filter(
        (value): value is number => typeof value === "number" && value > 0,
      )
      .reduce<number | null>((nearest, value) => {
        if (nearest === null) return value;
        return value < nearest ? value : nearest;
      }, null);

    return {
      totalBuckets,
      totalLimit,
      totalRemaining,
      activeBuckets,
      stressedBuckets,
      criticalBuckets,
      nearestResetMs,
    };
  }, [buckets]);

  if (buckets.length === 0) {
    return (
      <Stack gap="sm">
        <Title order={3}>ESI Rate Limits</Title>
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          color="gray"
          variant="light"
        >
          No ESI rate-limit buckets discovered yet. Buckets appear here after
          the client sees rate-limit metadata and/or makes ESI requests.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <Stack gap={0}>
          <Title order={3}>ESI Rate Limits</Title>
          <Text size="xs" c="dimmed">
            Compatibility date: {buildDate || "-"}
          </Text>
        </Stack>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        <Paper withBorder p="md" shadow="xs">
          <Text size="xs" c="dimmed">
            Buckets
          </Text>
          <Text size="xl" fw={700}>
            {summary.totalBuckets.toLocaleString()}
          </Text>
          <Text size="xs" c="dimmed">
            {summary.activeBuckets.toLocaleString()} active in current windows
          </Text>
        </Paper>

        <Paper withBorder p="md" shadow="xs">
          <Text size="xs" c="dimmed">
            Stressed Buckets
          </Text>
          <Text
            size="xl"
            fw={700}
            c={summary.stressedBuckets > 0 ? "orange" : undefined}
          >
            {summary.stressedBuckets.toLocaleString()}
          </Text>
          <Text size="xs" c="dimmed">
            {summary.criticalBuckets.toLocaleString()} critical (&lt;20%
            remaining)
          </Text>
        </Paper>

        <Paper withBorder p="md" shadow="xs">
          <Text size="xs" c="dimmed">
            Nearest Token Reset
          </Text>
          <Text size="xl" fw={700}>
            {summary.nearestResetMs
              ? formatDuration(summary.nearestResetMs)
              : "-"}
          </Text>
          <Text size="xs" c="dimmed">
            Earliest release among all active buckets
          </Text>
        </Paper>
      </SimpleGrid>

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
              <Table.Th>Bucket</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th ta="right">Remaining</Table.Th>
              <Table.Th ta="right">Limit</Table.Th>
              <Table.Th ta="right">Window</Table.Th>
              <Table.Th>Utilization</Table.Th>
              <Table.Th ta="right">Active Entries</Table.Th>
              <Table.Th ta="right">Used Tokens</Table.Th>
              <Table.Th ta="right">
                Tokens/min ({timelineMinutePoints.toLocaleString()}m)
              </Table.Th>
              <Table.Th ta="right">Wait for 2 tokens</Table.Th>
              <Table.Th ta="right">Routes</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {buckets.map((bucket) => {
              const status = getBucketStatus(bucket.limit, bucket.remaining);

              return (
                <Table.Tr key={bucket.bucketKey}>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Text size="sm" fw={600}>
                        {bucket.group}
                      </Text>
                      {!bucket.isAnonymousUser &&
                        bucket.characterId != null && (
                          <Group gap={4} wrap="nowrap">
                            <CharacterAvatar
                              characterId={bucket.characterId}
                              radius="xl"
                              size={18}
                            />
                            <Text size="xs" fw={500}>
                              {bucket.characterName ??
                                `Character ${bucket.characterId}`}
                            </Text>
                          </Group>
                        )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {bucket.userId}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={status.color} variant="light">
                      {status.label}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="right">
                    {bucket.remaining.toLocaleString()}
                  </Table.Td>
                  <Table.Td ta="right">
                    {bucket.limit.toLocaleString()}
                  </Table.Td>
                  <Table.Td ta="right">
                    {formatWindow(bucket.windowSeconds)}
                  </Table.Td>
                  <Table.Td miw={170}>
                    <Group gap="xs" wrap="nowrap" align="center">
                      <Progress
                        value={bucket.utilizationPercent}
                        color={status.color}
                        size="sm"
                        radius="xl"
                        style={{ flex: 1 }}
                      />
                      <Text
                        size="xs"
                        c="dimmed"
                        style={{ minWidth: 42 }}
                        ta="right"
                      >
                        {bucket.utilizationPercent.toFixed(0)}%
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right">
                    {bucket.activeTokenEntries.toLocaleString()}
                  </Table.Td>
                  <Table.Td ta="right">
                    {bucket.usedTokensInWindow.toLocaleString()}
                  </Table.Td>
                  <Table.Td miw={150}>
                    <Sparkline
                      data={bucket.tokensUsedTimeline}
                      h={32}
                      withGradient={false}
                      color={status.color}
                    />
                  </Table.Td>
                  <Table.Td ta="right">
                    {formatDuration(bucket.waitForTwoTokensMs)}
                  </Table.Td>
                  <Table.Td ta="right">
                    {bucket.routeMatchers.length > 0 ? (
                      <Tooltip
                        multiline
                        w={380}
                        label={bucket.routeMatchers.join("\n")}
                        withArrow
                        position="left"
                      >
                        <Badge variant="outline">
                          {bucket.routeCount.toLocaleString()}
                        </Badge>
                      </Tooltip>
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
    </Stack>
  );
}
