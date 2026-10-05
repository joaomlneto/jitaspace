"use client";

import {
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import type { DataTableColumn } from "@jitaspace/datatable";
import {
  CharacterAnchor,
  FactionAnchor,
  SolarSystemAnchor,
} from "@jitaspace/eve-components";
import { JournalIcon } from "@jitaspace/eve-icons";
import {
  EpicArcAnchor,
  EveIconAvatar,
  FactionAvatar,
  ISKAmount,
} from "@jitaspace/ui";

import type { AgentRef } from "~/lib/missionRefs";
import { DataTable } from "~/components/DataTable";
import { StatCard } from "~/components/EntityPage";
import { isRepeatable } from "~/lib/epicArcs";
import { formatMinutes } from "~/lib/missions";

export interface EpicArcRow {
  epicArcId: number;
  name: string;
  iconId: number | null;
  factionId: number | null;
  factionName: string | null;
  arcRestartInterval: number | null;
  missionCount: number;
  agentCount: number;
  chapterCount: number;
  /** Steps that lead to more than one next mission. */
  choiceCount: number;
  endingCount: number;
  /** ISK across every step, every branch counted. */
  totalIsk: number;
  /** The agent who hands out the arc's first mission. */
  startAgent: AgentRef | null;
}

const columns: DataTableColumn<EpicArcRow>[] = [
  {
    id: "epicArcId",
    header: "ID",
    accessor: "epicArcId",
    sortable: true,
    width: 80,
    defaultVisible: false,
  },
  {
    id: "name",
    header: "Epic Arc",
    accessor: "name",
    sortable: true,
    cell: (row) => (
      <Group gap="xs" wrap="nowrap">
        <EveIconAvatar iconId={row.iconId} size="sm" radius="sm" />
        <EpicArcAnchor epicArcId={row.epicArcId}>{row.name}</EpicArcAnchor>
      </Group>
    ),
  },
  {
    id: "faction",
    header: "Faction",
    accessor: "factionName",
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) =>
      row.factionId === null ? null : (
        <Group gap={6} wrap="nowrap">
          <FactionAvatar factionId={row.factionId} size="xs" />
          <FactionAnchor factionId={row.factionId} size="sm">
            {row.factionName ?? row.factionId}
          </FactionAnchor>
        </Group>
      ),
  },
  {
    id: "startAgent",
    header: "Starts With",
    accessor: (row) => row.startAgent?.name ?? null,
    sortable: true,
    cell: (row) =>
      row.startAgent === null ? null : (
        <Stack gap={0}>
          <CharacterAnchor characterId={row.startAgent.characterId} size="sm">
            {row.startAgent.name ?? row.startAgent.characterId}
          </CharacterAnchor>
          {row.startAgent.solarSystemId !== null && (
            <Text size="xs" c="dimmed">
              <SolarSystemAnchor
                solarSystemId={row.startAgent.solarSystemId}
                size="xs"
              >
                {row.startAgent.solarSystemName}
              </SolarSystemAnchor>
              {row.startAgent.regionName && ` (${row.startAgent.regionName})`}
            </Text>
          )}
        </Stack>
      ),
  },
  {
    id: "startRegion",
    header: "Starting Region",
    accessor: (row) => row.startAgent?.regionName ?? null,
    sortable: true,
    filter: { type: "multi-select" },
    defaultVisible: false,
  },
  {
    id: "missions",
    header: "Missions",
    accessor: "missionCount",
    sortable: true,
    align: "right",
  },
  {
    id: "agents",
    header: "Agents",
    accessor: "agentCount",
    sortable: true,
    align: "right",
  },
  {
    id: "chapters",
    header: "Chapters",
    accessor: "chapterCount",
    sortable: true,
    align: "right",
    defaultVisible: false,
  },
  {
    id: "choices",
    header: "Choices",
    accessor: "choiceCount",
    sortable: true,
    align: "right",
  },
  {
    id: "endings",
    header: "Endings",
    accessor: "endingCount",
    sortable: true,
    align: "right",
  },
  {
    id: "totalIsk",
    header: "ISK (All Steps)",
    accessor: "totalIsk",
    sortable: true,
    align: "right",
    cell: (row) => <ISKAmount amount={row.totalIsk} span size="sm" />,
  },
  {
    id: "repeatable",
    header: "Repeatable",
    accessor: (row) => isRepeatable(row.arcRestartInterval),
    filter: { type: "boolean" },
    cell: (row) =>
      isRepeatable(row.arcRestartInterval)
        ? `Every ${formatMinutes(row.arcRestartInterval ?? 0)}`
        : "No",
  },
];

export default function EpicArcsPage({
  arcs,
}: Readonly<{ arcs: EpicArcRow[] }>) {
  const missions = arcs.reduce((sum, arc) => sum + arc.missionCount, 0);
  const repeatable = arcs.filter((arc) =>
    isRepeatable(arc.arcRestartInterval),
  ).length;
  const factions = new Set(
    arcs.flatMap((arc) => (arc.factionId === null ? [] : [arc.factionId])),
  ).size;
  return (
    <Container size="xl">
      <Stack>
        <Group>
          <JournalIcon width={48} />
          <Title>Epic Arcs</Title>
        </Group>
        <Text c="dimmed" maw={760}>
          Long, branching chains of agent missions that tell one story from
          start to finish. Each arc moves you between agents, often asks you to
          choose a side, and ends in one of several ways.
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          <StatCard label="Epic Arcs" value={arcs.length} />
          <StatCard label="Missions" value={missions} />
          <StatCard label="Repeatable" value={repeatable} />
          <StatCard label="Factions" value={factions} />
        </SimpleGrid>
        <DataTable
          data={arcs}
          columns={columns}
          rowId={(row) => row.epicArcId}
          withGlobalFilter
          withColumnVisibility
          initialSort={{ columnId: "name", direction: "asc" }}
          verticalSpacing="xs"
          highlightOnHover
          striped
        />
      </Stack>
    </Container>
  );
}
