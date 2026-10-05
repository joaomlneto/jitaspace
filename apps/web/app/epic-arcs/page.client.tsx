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

import type { EpicArcSummary } from "~/lib/epicArcs";
import type { AgentRef } from "~/lib/missionRefs";
import { DataTable } from "~/components/DataTable";
import { StatCard } from "~/components/EntityPage";
import { isRepeatable } from "~/lib/epicArcs";
import { formatMinutes } from "~/lib/missions";

export interface EpicArcRow extends Omit<EpicArcSummary, "starts"> {
  epicArcId: number;
  name: string;
  iconId: number | null;
  factionId: number | null;
  factionName: string | null;
  arcRestartInterval: number | null;
  /** Every agent who hands out one of the arc's first missions. */
  startAgents: AgentRef[];
}

function StartAgent({ agent }: Readonly<{ agent: AgentRef }>) {
  return (
    <Stack gap={0}>
      <CharacterAnchor characterId={agent.characterId} size="sm">
        {agent.name ?? agent.characterId}
      </CharacterAnchor>
      {agent.solarSystemId !== null && (
        <Text size="xs" c="dimmed">
          <SolarSystemAnchor solarSystemId={agent.solarSystemId} size="xs">
            {agent.solarSystemName}
          </SolarSystemAnchor>
          {agent.regionName && ` (${agent.regionName})`}
        </Text>
      )}
    </Stack>
  );
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
    accessor: (row) => row.startAgents.map((agent) => agent.name ?? ""),
    sortAccessor: (row) => row.startAgents[0]?.name ?? null,
    sortable: true,
    cell: (row) => (
      <Stack gap={4}>
        {row.startAgents.map((agent) => (
          <StartAgent key={agent.characterId} agent={agent} />
        ))}
      </Stack>
    ),
  },
  {
    id: "startRegion",
    header: "Starting Region",
    // An array: a filter matches when any start is in the chosen region.
    accessor: (row) => [
      ...new Set(
        row.startAgents.flatMap((agent) =>
          agent.regionName ? [agent.regionName] : [],
        ),
      ),
    ],
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
