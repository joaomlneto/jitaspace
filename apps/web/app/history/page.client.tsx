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
  Loader,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  Timeline,
  Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { collectionMeta, entityTypeMeta } from "~/lib/history";
import { getHistoryIndex } from "~/lib/history-actions";

export default function HistoryIndexClient() {
  const router = useRouter();
  const [entityId, setEntityId] = useState<number | string>("");
  const [entityType, setEntityType] = useState("type");
  // Collections currently checked; null ⇒ all (until the user unchecks one).
  const [selected, setSelected] = useState<string[] | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["history-index"],
    queryFn: getHistoryIndex,
    staleTime: Infinity,
  });

  if (isLoading) return <Loader />;

  if (!data) {
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

  const collections = data.collections ?? ["types"];
  const active = selected ?? collections;
  const changedBuildCount = data.builds.filter((b) => b.changeCount > 0).length;

  // entity kinds present, biggest population first (types dwarf the rest)
  const entityTypes = [...data.entityTypes].sort(
    (a, b) =>
      (data.entityIdsByType[b]?.length ?? 0) -
      (data.entityIdsByType[a]?.length ?? 0),
  );
  const countsLabel = entityTypes
    .map(
      (et) =>
        `${(data.entityIdsByType[et]?.length ?? 0).toLocaleString()} ${entityTypeMeta(
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
          <Timeline active={-1} bulletSize={18} lineWidth={2}>
            {builds.map((b) => (
              <Timeline.Item
                key={b.build}
                title={
                  <Group gap="xs">
                    <Anchor
                      component={Link}
                      href={`/history/build/${b.build}`}
                      c={b.visibleCount === 0 ? "dimmed" : undefined}
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
                }
              >
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
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
                        >
                          {collectionMeta(c).label} {n}
                        </Badge>
                      ))}
                </Group>
              </Timeline.Item>
            ))}
          </Timeline>
        </div>
      </Stack>
    </Container>
  );
}
