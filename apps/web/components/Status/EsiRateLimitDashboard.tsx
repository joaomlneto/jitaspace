"use client";

import {
  Badge,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { useEsiRateLimit } from "@jitaspace/esi-client";

export function EsiRateLimitDashboard() {
  const rateLimitState = useEsiRateLimit();

  const groups = Object.values(rateLimitState).sort((a, b) =>
    a.group.localeCompare(b.group),
  );

  if (groups.length === 0) {
    return null;
  }

  return (
    <Stack gap="md">
      <Title order={3}>ESI Rate Limiting</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
        {groups.map((state) => {
          const percentage = (state.remaining / state.limit) * 100;
          const color =
            percentage < 20 ? "red" : percentage < 50 ? "yellow" : "green";

          return (
            <Paper key={state.group} withBorder p="md" shadow="xs">
              <Stack gap="xs">
                <Group justify="space-between" wrap="nowrap">
                  <Text size="sm" fw={700} truncate title={state.group}>
                    {state.group}
                  </Text>
                  <Badge variant="outline" size="xs">
                    {state.limit}/{state.windowSeconds / 60}m
                  </Badge>
                </Group>

                <Group justify="space-between">
                  <Text size="xl" fw={700}>
                    {Math.max(0, state.remaining)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    tokens remaining
                  </Text>
                </Group>

                <Progress
                  value={percentage}
                  color={color}
                  size="sm"
                  radius="xl"
                />

                {state.consumedTokens.length > 0 && (
                  <Text size="xs" c="dimmed">
                    {state.consumedTokens.length} active tokens in window
                  </Text>
                )}
              </Stack>
            </Paper>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}
