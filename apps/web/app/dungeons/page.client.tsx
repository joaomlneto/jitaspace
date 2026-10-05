"use client";

import { useMemo } from "react";
import {
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import { FactionAnchor } from "@jitaspace/eve-components";
import { AgencyIcon } from "@jitaspace/eve-icons";
import { DungeonAnchor, FactionAvatar, MissionAnchor } from "@jitaspace/ui";

import { DataTable } from "~/components/DataTable";
import { StatCard } from "~/components/EntityPage";
import { BooleanBadge } from "~/components/Missions";

/** One dungeon, ids only — names live once in the lookup tables beside it. */
export interface DungeonIndexRow {
  dungeonId: number;
  /** Whether dungeons.yaml describes it, rather than only referring to it. */
  described: boolean;
  name?: string;
  archetypeId?: number;
  factionId?: number;
  hasDescription?: boolean;
  /** Number of ship-restriction type lists. */
  restrictionCount?: number;
  missionCount?: number;
  /** The lowest-id mission set in this dungeon: `[missionId, name]`. */
  firstMission?: [number, string];
  agentCount?: number;
  operationCount?: number;
}

export interface DungeonsIndex {
  dungeons: DungeonIndexRow[];
  archetypes: Record<number, string>;
  factions: Record<number, string>;
}

interface DungeonTableRow extends DungeonIndexRow {
  archetypeName: string | null;
  factionName: string | null;
  usedBy: string | null;
}

const count = (value: number | undefined) =>
  value === undefined ? null : value.toLocaleString("en-US");

const columns: DataTableColumn<DungeonTableRow>[] = [
  {
    id: "dungeonId",
    header: "ID",
    accessor: "dungeonId",
    sortable: true,
    width: 90,
  },
  {
    id: "name",
    header: "Name",
    accessor: "name",
    sortable: true,
    cell: (row) => (
      <DungeonAnchor dungeonId={row.dungeonId}>
        {row.name ?? (
          <Text span c="dimmed" inherit>
            Dungeon {row.dungeonId}
          </Text>
        )}
      </DungeonAnchor>
    ),
  },
  {
    id: "archetype",
    header: "Archetype",
    accessor: "archetypeName",
    sortable: true,
    filter: { type: "multi-select" },
  },
  {
    id: "faction",
    header: "Faction",
    accessor: "factionName",
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) =>
      row.factionId === undefined ? null : (
        <Group gap={6} wrap="nowrap">
          <FactionAvatar factionId={row.factionId} size="xs" />
          <FactionAnchor factionId={row.factionId} size="sm">
            {row.factionName ?? row.factionId}
          </FactionAnchor>
        </Group>
      ),
  },
  {
    id: "usedBy",
    header: "Used By Mission",
    accessor: "usedBy",
    sortable: true,
    filter: { type: "text" },
    cell: (row) =>
      row.firstMission === undefined ? null : (
        <Text span size="sm">
          <MissionAnchor missionId={row.firstMission[0]} size="sm">
            {row.firstMission[1]}
          </MissionAnchor>
          {(row.missionCount ?? 0) > 1 && (
            <Text span c="dimmed" size="sm">
              {" "}
              +{(row.missionCount ?? 0) - 1} more
            </Text>
          )}
        </Text>
      ),
  },
  {
    id: "missions",
    header: "Missions",
    accessor: "missionCount",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    cell: (row) => count(row.missionCount),
  },
  {
    id: "agents",
    header: "Agents",
    accessor: "agentCount",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    cell: (row) => count(row.agentCount),
  },
  {
    id: "operations",
    header: "Operations",
    accessor: "operationCount",
    sortable: true,
    align: "right",
    defaultVisible: false,
    cell: (row) => count(row.operationCount),
  },
  {
    id: "restricted",
    header: "Ship Restrictions",
    accessor: (row) => (row.restrictionCount ?? 0) > 0,
    filter: { type: "boolean" },
    cell: (row) =>
      row.described ? (
        <BooleanBadge value={(row.restrictionCount ?? 0) > 0} />
      ) : null,
  },
  {
    id: "described",
    header: "In dungeons.yaml",
    accessor: "described",
    filter: { type: "boolean" },
    defaultVisible: false,
    cell: (row) => <BooleanBadge value={row.described} />,
  },
  {
    id: "hasDescription",
    header: "Has Description",
    accessor: (row) => row.hasDescription ?? false,
    filter: { type: "boolean" },
    defaultVisible: false,
    cell: (row) => <BooleanBadge value={row.hasDescription ?? false} />,
  },
];

export default function DungeonsPage({
  index,
}: Readonly<{ index: DungeonsIndex }>) {
  const rows = useMemo(
    () =>
      index.dungeons.map(
        (dungeon): DungeonTableRow => ({
          ...dungeon,
          archetypeName:
            dungeon.archetypeId === undefined
              ? null
              : (index.archetypes[dungeon.archetypeId] ?? null),
          factionName:
            dungeon.factionId === undefined
              ? null
              : (index.factions[dungeon.factionId] ?? null),
          usedBy: dungeon.firstMission?.[1] ?? null,
        }),
      ),
    [index],
  );

  const stats = useMemo(() => {
    const described = index.dungeons.filter((d) => d.described).length;
    return {
      total: index.dungeons.length,
      described,
      referenced: index.dungeons.length - described,
      mission: index.dungeons.filter((d) => d.missionCount !== undefined)
        .length,
      restricted: index.dungeons.filter((d) => (d.restrictionCount ?? 0) > 0)
        .length,
    };
  }, [index]);

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <AgencyIcon width={48} />
          <Title>Dungeons</Title>
        </Group>
        <Text c="dimmed" maw={760}>
          The deadspace pockets and sites of New Eden — combat anomalies,
          escalations, ore and ice belts, incursion and Factional Warfare sites,
          and the pockets agent missions send pilots into. The Static Data
          Export describes only some of them; the rest are known because a
          mission, an agent or an operation refers to them.
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
          <StatCard
            label="Dungeons"
            value={stats.total.toLocaleString("en-US")}
          />
          <StatCard
            label="Described"
            value={stats.described.toLocaleString("en-US")}
            sub="in dungeons.yaml"
          />
          <StatCard
            label="Referenced Only"
            value={stats.referenced.toLocaleString("en-US")}
          />
          <StatCard
            label="Mission Pockets"
            value={stats.mission.toLocaleString("en-US")}
          />
          <StatCard
            label="Ship-Restricted"
            value={stats.restricted.toLocaleString("en-US")}
          />
        </SimpleGrid>
        <DataTable
          data={rows}
          columns={columns}
          rowId={(row) => row.dungeonId}
          withGlobalFilter
          withColumnVisibility
          withPagination
          defaultPageSize={25}
          initialSort={{ columnId: "name", direction: "asc" }}
          verticalSpacing="xs"
          highlightOnHover
          striped
        />
      </Stack>
    </Container>
  );
}
