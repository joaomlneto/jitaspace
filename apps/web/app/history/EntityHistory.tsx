"use client";

import type { ReactNode } from "react";
import { Suspense, use } from "react";
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
import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";

import type { Provenance, TimelineEvent } from "~/lib/history";
import type { EntityHistoryData } from "~/lib/history-entity-page";
import {
  collectionMeta,
  fromBuildLabel,
  provenanceMeta,
  serverMeta,
} from "~/lib/history";
import { KIND_COLOR } from "./_diff";
import { EventContent } from "./_event";
import { HistoryLabelsProvider } from "./_labels-context";

/**
 * Shared change-history timeline for any entity kind. Renders the
 * collection-filter chips and the per-build timeline from `history`, which the
 * server read with the page (`getCachedEntityHistory`): the timeline and the
 * labels for every id in it, so nothing here fetches. `renderHeader` lets each
 * route supply its own heading (icon, name, links).
 *
 * `embedded` renders without the outer page `Container` (and typically without
 * a header) so the timeline can sit inside a host that already provides one —
 * e.g. the History tab on the type page.
 */
export function EntityHistory({
  history,
  renderHeader,
  embedded = false,
}: Readonly<{
  history: EntityHistoryData;
  renderHeader?: (history: EntityHistoryData) => ReactNode;
  embedded?: boolean;
}>) {
  return (
    <HistoryLabelsProvider labels={history.labels}>
      <EntityTimelineView
        history={history}
        renderHeader={renderHeader}
        embedded={embedded}
      />
    </HistoryLabelsProvider>
  );
}

function EntityTimelineView({
  history,
  renderHeader,
  embedded,
}: Readonly<{
  history: EntityHistoryData;
  renderHeader?: (history: EntityHistoryData) => ReactNode;
  embedded: boolean;
}>) {
  const { entityType, timeline: data } = history;
  // Collections currently checked; null ⇒ all (until the user unchecks one).
  // No .withDefault() — nuqs returns null when the param is absent, which is
  // exactly the "all" sentinel this filter already used.
  //
  // EntityHistory is embedded in other pages (e.g. the History tab on
  // /type/[typeId]), so its key is namespaced via urlKeys per the shared-
  // component convention, rather than claiming a bare `collections`.
  const [{ selected }, setFilters] = useQueryStates(
    { selected: parseAsArrayOf(parseAsString) },
    { urlKeys: { selected: "histCollections" }, history: "replace" },
  );
  const setSelected = (value: string[]) => void setFilters({ selected: value });

  const header = renderHeader?.(history) ?? null;

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
  // The `histCollections` param is shared across entities, so it can name a
  // collection this one doesn't have. Left alone that filters everything out
  // AND renders no chip to untick it, stranding the view on "No changes match"
  // over a non-empty timeline. Intersect to avoid that — but keep the
  // tri-state intact: null ⇒ all, and a deliberate empty selection stays empty.
  const selectedHere = selected?.filter((c) => seenCollections.includes(c));
  let active: string[];
  if (selected === null || selectedHere === undefined) {
    active = seenCollections; // no param ⇒ everything
  } else if (selected.length > 0 && selectedHere.length === 0) {
    active = seenCollections; // param named only collections this entity lacks
  } else {
    active = selectedHere; // includes the user's deliberate "none"
  }
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
                        <EventContent
                          event={event}
                          entityType={entityType}
                          entityId={history.entityId}
                        />
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

/**
 * An entity's history inside a host page's History tab. `history` is null when
 * the host's server read of it failed (`loadEntityHistory`), which hides the
 * timeline rather than failing the page.
 */
export function EmbeddedEntityHistory({
  history,
}: Readonly<{ history: EntityHistoryData | null }>) {
  if (!history)
    return (
      <Alert color="gray">
        The change history could not be loaded. Reload the page to try again.
      </Alert>
    );
  return <EntityHistory history={history} embedded />;
}

/**
 * An entity's history that the server is still reading when the host page
 * starts streaming: the item page passes the read's promise rather than
 * awaiting it, so its first byte never waits on the history, and the timeline
 * arrives later in the same response. The browser fetches nothing.
 */
export function StreamedEntityHistory({
  history,
}: Readonly<{ history: Promise<EntityHistoryData | null> }>) {
  return (
    <Suspense fallback={<Loader />}>
      <ResolvedEntityHistory history={history} />
    </Suspense>
  );
}

function ResolvedEntityHistory({
  history,
}: Readonly<{ history: Promise<EntityHistoryData | null> }>) {
  return <EmbeddedEntityHistory history={use(history)} />;
}
