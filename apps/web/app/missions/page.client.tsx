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
import {
  FactionAnchor,
  TypeAnchor,
  TypeAvatar,
} from "@jitaspace/eve-components";
import { JournalIcon } from "@jitaspace/eve-icons";
import {
  CorporationAnchor,
  DungeonAnchor,
  FactionAvatar,
  ISKAmount,
  MissionAnchor,
} from "@jitaspace/ui";

import type { MissionKind } from "~/lib/missions";
import { DataTable } from "~/components/DataTable";
import { StatCard } from "~/components/EntityPage";
import { BooleanBadge, MissionKindBadge } from "~/components/Missions";
import {
  formatExpiration,
  formatMinutes,
  ISK_TYPE_ID,
  MISSION_KIND_LABELS,
} from "~/lib/missions";

/** One mission, ids only — names live once in the lookup tables beside it. */
export interface MissionIndexRow {
  missionId: number;
  name: string;
  kind: MissionKind;
  hasBriefing: boolean;
  factionId?: number;
  corporationId?: number;
  agentTypeId?: number;
  dungeonId?: number;
  objectiveTypeId?: number;
  objectiveQuantity?: number;
  rewardTypeId?: number;
  rewardQuantity?: number;
  bonusRewardTypeId?: number;
  bonusRewardQuantity?: number;
  bonusTimeInterval?: number;
  expirationTime?: number;
  hasStandingRewards?: boolean;
  epicArcId?: number;
}

export interface MissionsIndex {
  missions: MissionIndexRow[];
  factions: Record<number, string>;
  corporations: Record<number, string>;
  agentTypes: Record<number, string>;
  types: Record<number, string>;
  dungeons: Record<number, string>;
  epicArcs: Record<number, string>;
}

interface MissionTableRow extends MissionIndexRow {
  kindLabel: string;
  factionName: string | null;
  corporationName: string | null;
  agentTypeName: string | null;
  dungeonName: string | null;
  objectiveName: string | null;
  rewardIsk: number | null;
  rewardItemName: string | null;
  bonusIsk: number | null;
  epicArcName: string | null;
}

const lookup = (table: Record<number, string>, id: number | undefined) =>
  id === undefined ? null : (table[id] ?? null);

/** An ISK amount when the reward is ISK; the item otherwise. */
const isk = (typeId: number | undefined, quantity: number | undefined) =>
  typeId === ISK_TYPE_ID ? (quantity ?? null) : null;

const columns: DataTableColumn<MissionTableRow>[] = [
  {
    id: "missionId",
    header: "ID",
    accessor: "missionId",
    sortable: true,
    width: 90,
    defaultVisible: false,
  },
  {
    id: "name",
    header: "Mission",
    accessor: "name",
    sortable: true,
    cell: (row) => (
      <MissionAnchor missionId={row.missionId}>{row.name}</MissionAnchor>
    ),
  },
  {
    id: "kind",
    header: "Type",
    accessor: "kindLabel",
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) => <MissionKindBadge kind={row.kind} />,
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
    id: "corporation",
    header: "Corporation",
    accessor: "corporationName",
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) =>
      row.corporationId === undefined ? null : (
        <CorporationAnchor corporationId={row.corporationId} size="sm">
          {row.corporationName ?? row.corporationId}
        </CorporationAnchor>
      ),
  },
  {
    id: "agentType",
    header: "Agent Type",
    accessor: "agentTypeName",
    sortable: true,
    filter: { type: "multi-select" },
    defaultVisible: false,
  },
  {
    id: "epicArc",
    header: "Epic Arc",
    accessor: "epicArcName",
    sortable: true,
    filter: { type: "multi-select" },
  },
  {
    id: "dungeon",
    header: "Dungeon",
    accessor: "dungeonId",
    sortable: true,
    defaultVisible: false,
    cell: (row) =>
      row.dungeonId === undefined ? null : (
        <DungeonAnchor dungeonId={row.dungeonId} size="sm">
          {row.dungeonName ?? row.dungeonId}
        </DungeonAnchor>
      ),
  },
  {
    id: "objective",
    header: "Objective Item",
    accessor: "objectiveName",
    sortable: true,
    filter: { type: "text" },
    cell: (row) =>
      row.objectiveTypeId === undefined ? null : (
        <Group gap={6} wrap="nowrap">
          <TypeAvatar typeId={row.objectiveTypeId} size="xs" />
          <Text span size="sm">
            {row.objectiveQuantity !== undefined &&
              row.objectiveQuantity > 1 &&
              `${row.objectiveQuantity.toLocaleString("en-US")} × `}
            <TypeAnchor typeId={row.objectiveTypeId} size="sm">
              {row.objectiveName ?? row.objectiveTypeId}
            </TypeAnchor>
          </Text>
        </Group>
      ),
  },
  {
    id: "rewardIsk",
    header: "ISK Reward",
    accessor: "rewardIsk",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    cell: (row) =>
      row.rewardIsk === null ? null : (
        <ISKAmount amount={row.rewardIsk} span size="sm" />
      ),
  },
  {
    id: "rewardItem",
    header: "Item Reward",
    accessor: "rewardItemName",
    sortable: true,
    defaultVisible: false,
    cell: (row) =>
      row.rewardItemName === null || row.rewardTypeId === undefined ? null : (
        <Text span size="sm">
          {row.rewardQuantity !== undefined &&
            row.rewardQuantity > 1 &&
            `${row.rewardQuantity.toLocaleString("en-US")} × `}
          <TypeAnchor typeId={row.rewardTypeId} size="sm">
            {row.rewardItemName}
          </TypeAnchor>
        </Text>
      ),
  },
  {
    id: "bonusIsk",
    header: "ISK Bonus",
    accessor: "bonusIsk",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    cell: (row) =>
      row.bonusIsk === null ? null : (
        <ISKAmount amount={row.bonusIsk} span size="sm" />
      ),
  },
  {
    id: "bonusTime",
    header: "Bonus Window",
    accessor: "bonusTimeInterval",
    sortable: true,
    defaultVisible: false,
    align: "right",
    cell: (row) =>
      row.bonusTimeInterval === undefined
        ? null
        : formatMinutes(row.bonusTimeInterval),
  },
  {
    id: "expiration",
    header: "Offer Expires",
    accessor: "expirationTime",
    sortable: true,
    defaultVisible: false,
    align: "right",
    cell: (row) =>
      row.expirationTime === undefined
        ? null
        : formatExpiration(row.expirationTime),
  },
  {
    id: "standings",
    header: "Standing Rewards",
    accessor: "hasStandingRewards",
    filter: { type: "boolean" },
    defaultVisible: false,
    cell: (row) => <BooleanBadge value={row.hasStandingRewards ?? null} />,
  },
  {
    id: "briefing",
    header: "Has Briefing",
    accessor: "hasBriefing",
    filter: { type: "boolean" },
    defaultVisible: false,
    cell: (row) => <BooleanBadge value={row.hasBriefing} />,
  },
];

export default function MissionsPage({
  index,
}: Readonly<{ index: MissionsIndex }>) {
  const rows = useMemo(
    () =>
      index.missions.map(
        (mission): MissionTableRow => ({
          ...mission,
          kindLabel: MISSION_KIND_LABELS[mission.kind],
          factionName: lookup(index.factions, mission.factionId),
          corporationName: lookup(index.corporations, mission.corporationId),
          agentTypeName: lookup(index.agentTypes, mission.agentTypeId),
          dungeonName: lookup(index.dungeons, mission.dungeonId),
          objectiveName: lookup(index.types, mission.objectiveTypeId),
          rewardIsk: isk(mission.rewardTypeId, mission.rewardQuantity),
          rewardItemName:
            mission.rewardTypeId === ISK_TYPE_ID
              ? null
              : lookup(index.types, mission.rewardTypeId),
          bonusIsk: isk(mission.bonusRewardTypeId, mission.bonusRewardQuantity),
          epicArcName: lookup(index.epicArcs, mission.epicArcId),
        }),
      ),
    [index],
  );

  const stats = useMemo(() => {
    const count = (kind: MissionKind) =>
      index.missions.filter((mission) => mission.kind === kind).length;
    return {
      total: index.missions.length,
      kill: count("kill"),
      courier: count("courier"),
      other: count("other"),
      epicArc: index.missions.filter((m) => m.epicArcId !== undefined).length,
      epicArcs: Object.keys(index.epicArcs).length,
    };
  }, [index]);

  return (
    <Container size="xl">
      <Stack>
        <Group>
          <JournalIcon width={48} />
          <Title>Missions</Title>
        </Group>
        <Text c="dimmed" maw={760}>
          Every mission an agent can offer, from the Static Data Export:
          encounters fought in a dungeon, courier runs, and the talk-to-agent
          steps of storylines and epic arcs — with who offers them, what they
          ask for and what they pay.
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
          <StatCard
            label="Missions"
            value={stats.total.toLocaleString("en-US")}
          />
          <StatCard
            label="Encounters"
            value={stats.kill.toLocaleString("en-US")}
          />
          <StatCard
            label="Courier"
            value={stats.courier.toLocaleString("en-US")}
          />
          <StatCard label="Other" value={stats.other.toLocaleString("en-US")} />
          <StatCard
            label="Epic Arc Missions"
            value={stats.epicArc.toLocaleString("en-US")}
            sub={`across ${stats.epicArcs} arcs`}
          />
        </SimpleGrid>
        <DataTable
          data={rows}
          columns={columns}
          rowId={(row) => row.missionId}
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
