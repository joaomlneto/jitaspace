"use client";

import { Badge, Group, Skeleton, Stack, Text, Timeline } from "@mantine/core";

import { CorporationName } from "@jitaspace/eve-components";
import { CorporationAnchor, CorporationAvatar } from "@jitaspace/ui";

import type { Stint } from "./employment";
import { formatDate } from "~/lib/format";
import { formatDays } from "./employment";

/** A character's corporations, newest first, as a timeline. */
export function EmploymentHistory({
  stints,
  isLoading,
}: Readonly<{ stints: Stint[]; isLoading: boolean }>) {
  if (isLoading) {
    return (
      <Stack gap="lg">
        {["first", "second", "third"].map((key) => (
          <Group key={key} gap="sm" wrap="nowrap">
            <Skeleton height={32} circle />
            <Stack gap={6} style={{ flex: 1 }}>
              <Skeleton height={14} width="45%" />
              <Skeleton height={10} width="70%" />
            </Stack>
          </Group>
        ))}
      </Stack>
    );
  }

  if (stints.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No employment history available.
      </Text>
    );
  }

  return (
    <Timeline active={-1} bulletSize={32} lineWidth={2}>
      {stints.map((stint) => (
        <Timeline.Item
          key={stint.recordId}
          bullet={
            <CorporationAvatar corporationId={stint.corporationId} size={28} />
          }
          title={
            <Group gap="xs">
              {/* A historical timeline is not a navigation surface. */}
              <CorporationAnchor
                corporationId={stint.corporationId}
                prefetch={false}
              >
                <CorporationName
                  span
                  corporationId={stint.corporationId}
                  fw={500}
                />
              </CorporationAnchor>
              {stint.isCurrent && (
                <Badge size="xs" color="teal" variant="light">
                  Current
                </Badge>
              )}
              {stint.isClosed && (
                <Badge size="xs" color="red" variant="light">
                  Closed
                </Badge>
              )}
            </Group>
          }
        >
          <Text size="xs" c="dimmed" mt={4}>
            {formatDate(stint.start)}
            {stint.end ? ` → ${formatDate(stint.end)}` : " → present"}
            {stint.days > 0 && ` · ${formatDays(stint.days)}`}
          </Text>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}
