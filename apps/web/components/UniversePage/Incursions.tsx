"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { Anchor, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { WindowInfoIcon } from "@jitaspace/eve-icons";

import type {
  SystemsById,
  UniverseIncursion,
  UniverseIncursions,
} from "./types";
import { formatDuration } from "~/app/incursions/math";
import {
  BossBadge,
  EveTime,
  percent,
  StateBadge,
} from "~/app/incursions/parts";
import { ConstellationAnchor } from "~/components/Anchor";
import { DataTable } from "~/components/DataTable";
import { SectionHeading, StatCard } from "~/components/EntityPage";
import { HoverPrefetchLink } from "~/components/Link";
import { formatDate, formatInteger } from "~/lib/format";
import { SystemLink } from "./parts";

/** The incursions still running. */
export const activeIncursions = (incursions: UniverseIncursions) =>
  incursions.incursions.filter((incursion) => incursion.endedAt === null);

/**
 * Each constellation's staging system: the one its latest incursion that
 * recorded one used. `incursions` must be most recent first.
 */
export function latestStagingByConstellation(
  incursions: readonly UniverseIncursion[],
): ReadonlyMap<number, number> {
  const staging = new Map<number, number>();
  for (const incursion of incursions) {
    if (
      incursion.stagingSolarSystemId !== null &&
      !staging.has(incursion.constellationId)
    ) {
      staging.set(incursion.constellationId, incursion.stagingSolarSystemId);
    }
  }
  return staging;
}

const Dash = () => (
  <Text span size="sm" c="dimmed">
    —
  </Text>
);

/** An incursion in progress: its state, influence and boss, and where to follow it. */
export function ActiveIncursionCard({
  incursion,
  where,
}: Readonly<{
  incursion: UniverseIncursion;
  /** Which constellation, on a page that spans several. */
  where?: ReactNode;
}>) {
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="xs">
        <Group gap="sm">
          <Text fw={600} c="bright">
            Incursion in progress
          </Text>
          {where}
          <StateBadge state={incursion.state} />
          {incursion.hasBoss && <BossBadge />}
        </Group>
        <Text size="sm" c="dimmed">
          Spawned <EveTime iso={incursion.firstSeenAt} />
          {incursion.influence !== null &&
            `, influence ${percent(incursion.influence)}`}
          .{" "}
          <Anchor component={HoverPrefetchLink} href="/incursions" size="sm">
            Follow it live on the incursions page
          </Anchor>
        </Text>
      </Stack>
    </Paper>
  );
}

interface IncursionRow extends UniverseIncursion {
  durationMs: number;
  stagingName: string | null;
  constellationName: string;
}

const columnsFor = (
  systemsById: SystemsById,
  withConstellation: boolean,
): DataTableColumn<IncursionRow>[] => [
  {
    id: "firstSeenAt",
    header: "Started (EVE)",
    accessor: "firstSeenAt",
    sortable: true,
    filter: { type: "date-range" },
    cell: (row) => <EveTime iso={row.firstSeenAt} />,
  },
  ...(withConstellation
    ? [
        {
          id: "constellation",
          header: "Constellation",
          accessor: "constellationName",
          sortable: true,
          filter: { type: "multi-select" },
          cell: (row) => (
            <ConstellationAnchor constellationId={row.constellationId}>
              {row.constellationName}
            </ConstellationAnchor>
          ),
        } satisfies DataTableColumn<IncursionRow>,
      ]
    : []),
  {
    id: "endedAt",
    header: "Ended (EVE)",
    accessor: "endedAt",
    sortable: true,
    cell: (row) =>
      row.endedAt ? (
        <EveTime iso={row.endedAt} />
      ) : (
        <StateBadge state={row.state} />
      ),
  },
  {
    id: "duration",
    header: "Duration",
    accessor: "durationMs",
    sortable: true,
    align: "right",
    cell: (row) => formatDuration(row.durationMs),
  },
  {
    id: "staging",
    header: "Staging",
    accessor: "stagingName",
    sortable: true,
    filter: { type: withConstellation ? "text" : "select" },
    cell: (row) =>
      row.stagingSolarSystemId === null ? (
        <Dash />
      ) : (
        <SystemLink
          solarSystemId={row.stagingSolarSystemId}
          systems={systemsById}
        />
      ),
  },
  {
    id: "hasBoss",
    header: "Boss",
    accessor: "hasBoss",
    sortable: true,
    filter: { type: "boolean" },
    cell: (row) => {
      if (row.hasBoss === null) return <Dash />;
      return row.hasBoss ? <BossBadge /> : null;
    },
  },
];

/**
 * Every incursion recorded, as figures and a table. A region's table adds a
 * Constellation column when given `constellationNames`.
 */
export function IncursionHistory({
  incursions,
  systemsById,
  constellationNames,
}: Readonly<{
  incursions: UniverseIncursions;
  systemsById: SystemsById;
  constellationNames?: ReadonlyMap<number, string>;
}>) {
  const readAt = Date.parse(incursions.readAt);
  const rows = useMemo<IncursionRow[]>(
    () =>
      incursions.incursions.map((incursion) => ({
        ...incursion,
        durationMs:
          (incursion.endedAt === null
            ? readAt
            : Date.parse(incursion.endedAt)) -
          Date.parse(incursion.firstSeenAt),
        stagingName:
          incursion.stagingSolarSystemId === null
            ? null
            : (systemsById.get(incursion.stagingSolarSystemId)?.name ?? null),
        constellationName:
          constellationNames?.get(incursion.constellationId) ??
          String(incursion.constellationId),
      })),
    [incursions.incursions, readAt, systemsById, constellationNames],
  );
  const columns = useMemo(
    () => columnsFor(systemsById, constellationNames !== undefined),
    [systemsById, constellationNames],
  );
  const oldest = incursions.incursions.at(-1);
  const latest = incursions.incursions[0];
  if (!latest || !oldest) return null;

  const ended = rows
    .filter((row) => row.endedAt !== null)
    .map((row) => row.durationMs)
    .sort((a, b) => a - b);
  const medianDuration = ended[Math.floor(ended.length / 2)];
  const constellationCount = new Set(rows.map((row) => row.constellationId))
    .size;

  return (
    <Stack gap="sm">
      <SectionHeading icon={<WindowInfoIcon size={18} alt="" />}>
        Every incursion
      </SectionHeading>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
        <StatCard
          label="Incursions"
          value={formatInteger(rows.length)}
          sub={
            constellationNames
              ? `Since ${formatDate(oldest.firstSeenAt)}, in ${formatInteger(constellationCount)} constellations`
              : `Since ${formatDate(oldest.firstSeenAt)}`
          }
        />
        <StatCard label="Latest" value={formatDate(latest.firstSeenAt)} />
        {medianDuration !== undefined && (
          <StatCard
            label="Typical length"
            value={formatDuration(medianDuration)}
            sub="Median of those that ended"
          />
        )}
        <StatCard
          label="Reached the boss"
          value={formatInteger(rows.filter((row) => row.hasBoss).length)}
          sub="Where the source recorded it"
        />
      </SimpleGrid>
      <DataTable
        data={rows}
        columns={columns}
        rowId={(row) => row.incursionId}
        withGlobalFilter
        withColumnVisibility
        withPagination
        defaultPageSize={10}
        initialSort={{ columnId: "firstSeenAt", direction: "desc" }}
        verticalSpacing="xs"
        withTableBorder
        highlightOnHover
        striped
      />
    </Stack>
  );
}
