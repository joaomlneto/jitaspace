"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Chip,
  Container,
  Group,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";

import type { HistoryIndex } from "~/lib/history";
import { collectionMeta, entityTypeMeta } from "~/lib/history";
import { HistoryTimelineChart } from "./_timeline-chart";

type VisibleBuild = HistoryIndex["builds"][number] & { visibleCount: number };

// Lightweight windowed list for the builds rail. With hundreds of changed
// builds, rendering every Mantine `Timeline.Item` (and re-rendering them all on
// each filter toggle) was the page's main weight. We render only the rows in (or
// near) the viewport, absolutely positioned inside a full-height spacer.
//
// The viewport height used for the range math is a constant, NOT a measured one
// — so there's no ResizeObserver dependency, it renders the first window on the
// very first paint (incl. SSR / jsdom), and short lists still render in full.
const ROW_HEIGHT = 60;
const LIST_VIEWPORT = 600;
const OVERSCAN = 8;

function BuildRailRow({
  b,
  active,
}: Readonly<{ b: VisibleBuild; active: string[] }>) {
  return (
    <Group wrap="nowrap" gap={0} style={{ height: ROW_HEIGHT }}>
      <div
        style={{
          width: 22,
          marginLeft: 6,
          alignSelf: "stretch",
          flexShrink: 0,
          position: "relative",
          borderLeft: "2px solid var(--mantine-color-default-border)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -6,
            top: 7,
            width: 10,
            height: 10,
            borderRadius: "50%",
            border: "2px solid var(--mantine-color-body)",
            background:
              b.visibleCount > 0
                ? "var(--mantine-color-blue-6)"
                : "var(--mantine-color-gray-5)",
          }}
        />
      </div>
      <Stack
        gap={2}
        style={{ flex: 1, minWidth: 0, paddingTop: 2, overflow: "hidden" }}
      >
        <Group gap="xs" wrap="nowrap">
          <Anchor
            component={Link}
            href={`/history/build/${b.build}`}
            c={b.visibleCount === 0 ? "dimmed" : undefined}
            size="sm"
          >
            Build {b.build}
          </Anchor>
          <Badge
            size="sm"
            variant="light"
            color={b.visibleCount > 0 ? "blue" : "gray"}
          >
            {b.changeCount === 0
              ? "no changes"
              : `${b.visibleCount.toLocaleString()} changes`}
          </Badge>
        </Group>
        <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
          <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
            {b.date ?? "date unknown"}
          </Text>
          {b.byCollection &&
            Object.entries(b.byCollection)
              .filter(([c]) => active.includes(c))
              .map(([c, n]) => (
                <Badge
                  key={c}
                  size="xs"
                  variant="dot"
                  color={collectionMeta(c).color}
                  style={{ flexShrink: 0 }}
                >
                  {collectionMeta(c).label} {n}
                </Badge>
              ))}
        </Group>
      </Stack>
    </Group>
  );
}

function VirtualBuildList({
  builds,
  active,
}: Readonly<{ builds: VisibleBuild[]; active: string[] }>) {
  const [scrollTop, setScrollTop] = useState(0);
  const total = builds.length * ROW_HEIGHT;
  // Clamp so a stale scrollTop (e.g. after a filter shrinks the list) can't
  // window past the end and render a blank viewport.
  const top = Math.min(scrollTop, Math.max(0, total - LIST_VIEWPORT));
  const start = Math.max(0, Math.floor(top / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(
    builds.length,
    Math.ceil((top + LIST_VIEWPORT) / ROW_HEIGHT) + OVERSCAN,
  );
  return (
    <div
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{ height: Math.min(LIST_VIEWPORT, total), overflowY: "auto" }}
    >
      <div style={{ height: total, position: "relative" }}>
        {builds.slice(start, end).map((b, i) => (
          <div
            key={b.build}
            style={{
              position: "absolute",
              top: (start + i) * ROW_HEIGHT,
              left: 0,
              right: 0,
            }}
          >
            <BuildRailRow b={b} active={active} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HistoryIndexClient({
  initialIndex,
}: Readonly<{ initialIndex: HistoryIndex | null }>) {
  const router = useRouter();
  const [entityId, setEntityId] = useState<number | string>("");
  const [entityType, setEntityType] = useState("type");
  // Collections currently checked; null ⇒ all (until the user unchecks one).
  const [selected, setSelected] = useState<string[] | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  // The index is server-rendered (day-cached) and passed in as a prop; a null
  // prop means no history exists yet or the read failed.
  if (!initialIndex) {
    return (
      <Container size="md" py="xl">
        <Title order={2}>Type Change History</Title>
        <Alert mt="md" color="gray">
          No history has been generated yet. Run{" "}
          <code>pnpm --filter @jitaspace/cli exec build-history</code> to
          produce it.
        </Alert>
      </Container>
    );
  }
  const data = initialIndex;

  const collections = data.collections ?? ["types"];
  const active = selected ?? collections;
  const changedBuildCount = data.builds.filter((b) => b.changeCount > 0).length;

  // entity kinds present, biggest population first (types dwarf the rest)
  const entityTypes = [...data.entityTypes].sort(
    (a, b) =>
      (data.entityCountsByType[b] ?? 0) - (data.entityCountsByType[a] ?? 0),
  );
  const countsLabel = entityTypes
    .map(
      (et) =>
        `${(data.entityCountsByType[et] ?? 0).toLocaleString()} ${entityTypeMeta(
          et,
        ).plural.toLowerCase()}`,
    )
    .join(", ");

  // newest build first; recount each build against the checked collections and
  // (unless the toggle is on) drop builds whose remaining count is zero
  const typesActive = active.includes("types");
  const getVisibleCount = (b: (typeof data.builds)[number]): number => {
    if (b.byCollection) {
      return Object.entries(b.byCollection)
        .filter(([c]) => active.includes(c))
        .reduce((sum, [, n]) => sum + n, 0);
    }
    return typesActive ? b.changeCount : 0;
  };
  const builds = [...data.builds]
    .sort((a, b) => b.build - a.build)
    .map((b) => ({ ...b, visibleCount: getVisibleCount(b) }))
    .filter((b) => showUnchanged || b.visibleCount > 0);

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>Type Change History</Title>
          <Text c="dimmed" size="sm" mt={4}>
            How EVE Online static data has changed across {changedBuildCount}{" "}
            client builds. {countsLabel} with recorded changes.
          </Text>
          <Group gap="xs" mt={8}>
            <Text size="xs" c="dimmed">
              Tracking:
            </Text>
            <Chip.Group multiple value={active} onChange={setSelected}>
              <Group gap={6}>
                {collections.map((c) => (
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
          </Group>
        </div>

        <HistoryTimelineChart builds={data.builds} collections={active} />

        <Group align="flex-end" gap="sm">
          {entityTypes.length > 1 && (
            <Select
              label="Kind"
              data={entityTypes.map((et) => ({
                value: et,
                label: entityTypeMeta(et).label,
              }))}
              value={entityType}
              onChange={(v) => v && setEntityType(v)}
              allowDeselect={false}
              w={160}
            />
          )}
          <NumberInput
            label="Jump to a timeline"
            placeholder={entityType === "type" ? "typeID, e.g. 587" : "id"}
            value={entityId}
            onChange={setEntityId}
            min={0}
            allowDecimal={false}
            w={220}
          />
          <Button
            onClick={() =>
              entityId && router.push(`/history/${entityType}/${entityId}`)
            }
            disabled={!entityId}
          >
            View timeline
          </Button>
        </Group>

        <div>
          <Group justify="space-between" mb="sm">
            <Title order={4}>Builds</Title>
            <Switch
              size="xs"
              label="Show builds without changes"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.currentTarget.checked)}
            />
          </Group>
          {builds.length === 0 && (
            <Text size="sm" c="dimmed">
              No builds match the selected collections.
            </Text>
          )}
          {builds.length > 0 && (
            <VirtualBuildList builds={builds} active={active} />
          )}
        </div>
      </Stack>
    </Container>
  );
}
