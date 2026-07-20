"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  Alert,
  Anchor,
  Badge,
  Chip,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Timeline,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import type { EntityTimeline, Provenance, TimelineEvent } from "~/lib/history";
import {
  collectionMeta,
  fromBuildLabel,
  provenanceMeta,
  serverMeta,
} from "~/lib/history";
import { getEntityTimeline } from "~/lib/history-actions";
import { KIND_COLOR } from "./_diff";
import { EventContent } from "./_event";

/**
 * Shared change-history timeline for any entity kind (type, skin, skinMaterial).
 * Fetches the entity's timeline, renders the collection-filter chips and the
 * per-build timeline. `renderHeader` lets each route supply its own heading
 * (icon, name, links), optionally using the loaded timeline for a label.
 *
 * `embedded` renders without the outer page `Container` (and typically without
 * a header) so the timeline can sit inside a host that already provides one —
 * e.g. the History tab on the type page.
 */
export function EntityHistory({
  entityType,
  entityId,
  renderHeader,
  embedded = false,
}: Readonly<{
  entityType: string;
  entityId: number;
  renderHeader?: (timeline: EntityTimeline | null) => ReactNode;
  embedded?: boolean;
}>) {
  const { data, isLoading } = useQuery({
    queryKey: ["history-entity", entityType, entityId],
    queryFn: () => getEntityTimeline(entityType, entityId),
    staleTime: Infinity,
  });
  // Collections currently checked; null ⇒ all (until the user unchecks one).
  const [selected, setSelected] = useState<string[] | null>(null);

  if (isLoading) return <Loader />;

  const header = renderHeader?.(data ?? null) ?? null;

  // When embedded the host supplies the page Container, so render bare to avoid
  // nesting containers (which would mis-constrain the timeline's width).
  const wrap = (children: ReactNode) =>
    embedded ? (
      children
    ) : (
      <Container size="md" py="xl">
        {children}
      </Container>
    );

  if (!data || data.events.length === 0) {
    return wrap(
      <Stack gap="lg">
        {header}
        <Alert color="gray">
          No recorded changes for this entity across the tracked builds.{" "}
          <Anchor component={Link} href="/history">
            Back to history
          </Anchor>
        </Alert>
      </Stack>,
    );
  }

  // most recent build at the top; within a build, the core record first
  const collectionRank = (c: string) => (c === "types" ? "" : c);
  const events = [...data.events].sort((a, b) => {
    if (a.build !== b.build) return b.build - a.build;
    return collectionRank(a.collection ?? "types").localeCompare(
      collectionRank(b.collection ?? "types"),
    );
  });

  // which collections appear in this entity's history (for the filter chips)
  const seenCollections = [
    ...new Set(events.map((e) => e.collection ?? "types")),
  ];
  const active = selected ?? seenCollections;
  const visibleEvents = events.filter((e) =>
    active.includes(e.collection ?? "types"),
  );

  // one timeline entry per build, holding every checked collection's change
  const buildGroups: {
    build: number;
    date: string | null;
    events: TimelineEvent[];
  }[] = [];
  for (const e of visibleEvents) {
    const last = buildGroups.at(-1);
    if (last?.build === e.build) last.events.push(e);
    else buildGroups.push({ build: e.build, date: e.date, events: [e] });
  }

  return wrap(
    <Stack gap="lg">
      {header}
      <Group gap="xs">
        <Badge variant="light">{visibleEvents.length} events</Badge>
        {seenCollections.length > 1 && (
          <Chip.Group multiple value={active} onChange={setSelected}>
            <Group gap={6}>
              {seenCollections.map((c) => (
                <Chip
                  key={c}
                  value={c}
                  size="xs"
                  color={collectionMeta(c).color}
                >
                  {collectionMeta(c).label}
                </Chip>
              ))}
            </Group>
          </Chip.Group>
        )}
        <Anchor component={Link} href="/history" size="sm">
          All history
        </Anchor>
      </Group>

      <Paper withBorder p="lg" radius="md">
        {buildGroups.length === 0 && (
          <Text size="sm" c="dimmed">
            No changes match the selected collections.
          </Text>
        )}
        <Timeline active={buildGroups.length} bulletSize={20} lineWidth={2}>
          {buildGroups.map((group) => {
            // Server is per target build (constant within the group). From-build
            // and provenance are per diff, and a build can be reached by more
            // than one diff (the SDE↔CDN junction), so surface the distinct set.
            const server = group.events[0]?.server ?? null;
            const fromBuilds = [
              ...new Set(group.events.map((e) => e.fromBuild ?? null)),
            ];
            const provenances = [
              ...new Set(
                group.events
                  .map((e) => e.provenance)
                  .filter((p): p is Provenance => p !== undefined),
              ),
            ];
            return (
              <Timeline.Item
                key={group.build}
                title={
                  <Group gap="xs">
                    <Anchor
                      component={Link}
                      href={`/history/build/${group.build}`}
                      fw={500}
                    >
                      {group.date ?? `Build ${group.build}`}
                    </Anchor>
                    <Text size="xs" c="dimmed">
                      build {group.build} · from{" "}
                      {fromBuilds.map(fromBuildLabel).join(", ")}
                    </Text>
                    <Badge
                      size="xs"
                      variant="light"
                      color={serverMeta(server).color}
                    >
                      {serverMeta(server).label}
                    </Badge>
                    {provenances.map((p) => (
                      <Badge
                        key={p}
                        size="xs"
                        variant="light"
                        color={provenanceMeta(p).color}
                      >
                        {provenanceMeta(p).label}
                      </Badge>
                    ))}
                  </Group>
                }
              >
                <Stack gap="sm" mt={2}>
                  {group.events.map((event) => {
                    const meta = collectionMeta(event.collection);
                    return (
                      <div key={event.collection ?? "types"}>
                        <Group gap="xs">
                          <Badge size="sm" variant="dot" color={meta.color}>
                            {meta.label}
                          </Badge>
                          <Badge
                            size="sm"
                            variant="light"
                            color={KIND_COLOR[event.kind]}
                          >
                            {event.kind}
                          </Badge>
                        </Group>
                        <EventContent event={event} entityType={entityType} />
                      </div>
                    );
                  })}
                </Stack>
              </Timeline.Item>
            );
          })}
        </Timeline>
      </Paper>
    </Stack>,
  );
}
