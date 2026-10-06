"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import {
  Alert,
  Anchor,
  Badge,
  Breadcrumbs,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  IconFileText,
  IconHistory,
  IconInfoCircle,
  IconListCheck,
  IconMapPin,
  IconSitemap,
  IconSwords,
  IconTarget,
  IconUsers,
} from "@tabler/icons-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import type { DataTableColumn } from "@jitaspace/datatable";
import {
  FactionAnchor,
  SolarSystemAnchor,
  TypeAnchor,
  TypeAvatar,
} from "@jitaspace/eve-components";
import { AgencyIcon } from "@jitaspace/eve-icons";
import {
  CorporationAnchor,
  DungeonAnchor,
  EpicArcAnchor,
  FactionAvatar,
  GroupAnchor,
  ISKAmount,
  MissionAnchor,
  TypeListAnchor,
} from "@jitaspace/ui";

import type {
  DungeonAgentInSpace,
  DungeonDetail,
  DungeonMission,
  DungeonShipRestriction,
  RelatedDungeon,
} from "./data";
import type { EntityHistoryData } from "~/lib/history-entity-page";
import type { FactionRef } from "~/lib/missionRefs";
import { DataTable } from "~/components/DataTable";
import { HeroStat, SectionHeading, StatCard } from "~/components/EntityPage";
import {
  AgentLabel,
  HeroImage,
  MissionKindBadge,
  MissionText,
  notAvailableText,
  TypeRefLabel,
} from "~/components/Missions";
import { dungeonDisplayName, MISSION_KIND_LABELS } from "~/lib/missions";
import { EmbeddedEntityHistory } from "../../history/EntityHistory";
import {
  DEFAULT_DUNGEON_PAGE_TAB,
  DUNGEON_PAGE_TABS,
  isDungeonPageTab,
} from "./tabs";

const missionColumns: DataTableColumn<DungeonMission>[] = [
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
    accessor: (row) => MISSION_KIND_LABELS[row.kind],
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) => <MissionKindBadge kind={row.kind} />,
  },
  {
    id: "faction",
    header: "Faction",
    accessor: (row) => row.faction?.name ?? null,
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) =>
      row.faction ? (
        <Group gap={6} wrap="nowrap">
          <FactionAvatar factionId={row.faction.factionId} size="xs" />
          <FactionAnchor factionId={row.faction.factionId} size="sm">
            {row.faction.name ?? row.faction.factionId}
          </FactionAnchor>
        </Group>
      ) : null,
  },
  {
    id: "corporation",
    header: "Corporation",
    accessor: (row) => row.corporation?.name ?? null,
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) =>
      row.corporation ? (
        <CorporationAnchor
          corporationId={row.corporation.corporationId}
          size="sm"
        >
          {row.corporation.name ?? row.corporation.corporationId}
        </CorporationAnchor>
      ) : null,
  },
  {
    id: "epicArc",
    header: "Epic Arc",
    accessor: "epicArcName",
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) =>
      row.epicArcId === null ? null : (
        <EpicArcAnchor epicArcId={row.epicArcId} size="sm">
          {row.epicArcName ?? row.epicArcId}
        </EpicArcAnchor>
      ),
  },
  {
    id: "objective",
    header: "Objective Item",
    accessor: (row) => row.objective?.type.name ?? null,
    sortable: true,
    cell: (row) =>
      row.objective ? (
        <TypeRefLabel
          type={row.objective.type}
          quantity={row.objective.quantity}
          size="xs"
        />
      ) : null,
  },
  {
    id: "rewardIsk",
    header: "ISK Reward",
    accessor: "rewardIsk",
    sortable: true,
    align: "right",
    cell: (row) =>
      row.rewardIsk === null ? null : (
        <ISKAmount amount={row.rewardIsk} span size="sm" />
      ),
  },
];

const securityColor = (security: number) => {
  if (security >= 0.45) return "teal";
  if (security > 0) return "yellow";
  return "red";
};

const agentColumns: DataTableColumn<DungeonAgentInSpace>[] = [
  {
    id: "agent",
    header: "Agent",
    accessor: (row) => row.agent.name,
    sortable: true,
    cell: (row) => <AgentLabel agent={row.agent} withLocation={false} />,
  },
  {
    id: "level",
    header: "Level",
    accessor: (row) => row.agent.level,
    sortable: true,
    filter: { type: "multi-select" },
    align: "right",
  },
  {
    id: "corporation",
    header: "Corporation",
    accessor: (row) => row.agent.corporationName,
    sortable: true,
    filter: { type: "multi-select" },
    // The agent cell already names it; this column is here to filter by.
    defaultVisible: false,
    cell: (row) =>
      row.agent.corporationId === null ? null : (
        <CorporationAnchor corporationId={row.agent.corporationId} size="sm">
          {row.agent.corporationName ?? row.agent.corporationId}
        </CorporationAnchor>
      ),
  },
  {
    id: "system",
    header: "Solar System",
    accessor: "solarSystemName",
    sortable: true,
    cell: (row) => (
      <Group gap={6} wrap="nowrap">
        {row.securityStatus !== null && (
          <Badge
            size="xs"
            variant="light"
            color={securityColor(row.securityStatus)}
          >
            {row.securityStatus.toFixed(1)}
          </Badge>
        )}
        <SolarSystemAnchor solarSystemId={row.solarSystemId} size="sm">
          {row.solarSystemName ?? row.solarSystemId}
        </SolarSystemAnchor>
      </Group>
    ),
  },
  {
    id: "region",
    header: "Region",
    accessor: "regionName",
    sortable: true,
    filter: { type: "multi-select" },
  },
  {
    id: "type",
    header: "Ship / Structure",
    accessor: (row) => row.type?.name ?? null,
    sortable: true,
    cell: (row) =>
      row.type ? <TypeRefLabel type={row.type} size="xs" /> : null,
  },
  {
    id: "spawnPoint",
    header: "Spawn Point",
    accessor: "spawnPointId",
    sortable: true,
    defaultVisible: false,
    align: "right",
  },
];

const relatedColumns: DataTableColumn<RelatedDungeon>[] = [
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
      <DungeonAnchor dungeonId={row.dungeonId}>{row.name}</DungeonAnchor>
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
];

interface RestrictionShipRow {
  typeId: number;
  name: string;
  groupId: number;
  groupName: string | null;
}

const restrictionShipColumns: DataTableColumn<RestrictionShipRow>[] = [
  {
    id: "name",
    header: "Ship",
    accessor: "name",
    sortable: true,
    cell: (row) => (
      <Group gap="xs" wrap="nowrap">
        <TypeAvatar typeId={row.typeId} size="sm" />
        <TypeAnchor typeId={row.typeId}>{row.name}</TypeAnchor>
      </Group>
    ),
  },
  {
    id: "group",
    header: "Group",
    accessor: "groupName",
    sortable: true,
    filter: { type: "multi-select" },
    cell: (row) => (
      <GroupAnchor groupId={row.groupId}>
        {row.groupName ?? `Group ${row.groupId}`}
      </GroupAnchor>
    ),
  },
];

function RestrictionPanel({
  restriction,
}: Readonly<{ restriction: DungeonShipRestriction }>) {
  const ships = useMemo<RestrictionShipRow[] | null>(
    () =>
      restriction.members?.map(([typeId, name, groupId]) => ({
        typeId,
        name,
        groupId,
        groupName: restriction.groups[groupId] ?? null,
      })) ?? null,
    [restriction],
  );
  const title =
    restriction.displayName ??
    restriction.name ??
    `Type list ${restriction.typeListId}`;
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Stack gap={2} style={{ minWidth: 0 }}>
            <TypeListAnchor typeListId={restriction.typeListId} fw={600}>
              <Text span lineClamp={1} title={title} inherit>
                {title}
              </Text>
            </TypeListAnchor>
            <Text size="xs" c="dimmed">
              Type list {restriction.typeListId} ·{" "}
              {restriction.memberCount.toLocaleString("en-US")} allowed{" "}
              {restriction.memberCount === 1 ? "ship" : "ships"}
            </Text>
          </Stack>
        </Group>
        {ships === null ? (
          <Text size="sm" c="dimmed">
            Too many to list here —{" "}
            <TypeListAnchor typeListId={restriction.typeListId} size="sm">
              see the full type list
            </TypeListAnchor>
            .
          </Text>
        ) : (
          <DataTable
            data={ships}
            columns={restrictionShipColumns}
            rowId={(row) => row.typeId}
            withGlobalFilter
            withPagination
            defaultPageSize={25}
            initialSort={{ columnId: "name", direction: "asc" }}
            verticalSpacing="xs"
            highlightOnHover
            striped
          />
        )}
      </Stack>
    </Paper>
  );
}

const plural = (count: number, noun: string) =>
  `${count.toLocaleString("en-US")} ${noun}${count === 1 ? "" : "s"}`;

const allowedShipCount = (dungeon: DungeonDetail) =>
  dungeon.restrictions.reduce(
    (sum, restriction) => sum + restriction.memberCount,
    0,
  );

function FactionLabel({ faction }: Readonly<{ faction: FactionRef }>) {
  return (
    <Group gap={6} wrap="nowrap">
      <FactionAvatar factionId={faction.factionId} size="sm" />
      <FactionAnchor factionId={faction.factionId}>
        {faction.name ?? `Faction ${faction.factionId}`}
      </FactionAnchor>
    </Group>
  );
}

/**
 * The missions whose pocket this is: the first of each distinct name, a few
 * at most. Best identifies a dungeon dungeons.yaml leaves unnamed.
 */
function PocketOf({ missions }: Readonly<{ missions: DungeonMission[] }>) {
  const firstByName = useMemo(() => {
    const byName = new Map<string, number>();
    for (const mission of missions) {
      if (!byName.has(mission.name)) {
        byName.set(mission.name, mission.missionId);
      }
    }
    return [...byName.entries()].slice(0, 3);
  }, [missions]);
  if (firstByName.length === 0) return null;
  return (
    <Text size="sm" c="dimmed">
      The pocket of{" "}
      {firstByName.map(([missionName, missionId], index) => (
        <Fragment key={missionId}>
          {index > 0 && ", "}
          <MissionAnchor missionId={missionId} size="sm">
            {missionName}
          </MissionAnchor>
        </Fragment>
      ))}
      {missions.length > firstByName.length &&
        ` and ${missions.length - firstByName.length} more`}
    </Text>
  );
}

function DungeonHeroImage({ dungeon }: Readonly<{ dungeon: DungeonDetail }>) {
  if (!dungeon.faction) return <AgencyIcon width={72} />;
  return (
    <FactionAvatar factionId={dungeon.faction.factionId} size={96} radius={0} />
  );
}

function DungeonHero({ dungeon }: Readonly<{ dungeon: DungeonDetail }>) {
  const archetypeTitle = dungeon.archetype?.title ?? null;
  return (
    <Paper withBorder radius="md" p="lg">
      <Group align="flex-start" gap="xl" wrap="wrap">
        <HeroImage>
          <DungeonHeroImage dungeon={dungeon} />
        </HeroImage>
        <Stack gap="sm" style={{ flex: 1, minWidth: 240 }}>
          <Group gap="sm" align="center">
            <Title order={2}>{dungeonDisplayName(dungeon)}</Title>
            {archetypeTitle && (
              <Badge variant="light" size="md">
                {archetypeTitle}
              </Badge>
            )}
            <Badge variant="light" color="gray" size="md">
              ID {dungeon.dungeonId}
            </Badge>
          </Group>

          {!dungeon.described && <PocketOf missions={dungeon.missions} />}

          {dungeon.faction && <FactionLabel faction={dungeon.faction} />}

          <Group gap="xl">
            {dungeon.missions.length > 0 && (
              <HeroStat
                label="Missions"
                value={dungeon.missions.length.toLocaleString("en-US")}
              />
            )}
            {dungeon.agents.length > 0 && (
              <HeroStat
                label="Agents in Space"
                value={dungeon.agents.length.toLocaleString("en-US")}
              />
            )}
            {dungeon.restrictions.length > 0 && (
              <HeroStat
                label="Allowed Ships"
                value={allowedShipCount(dungeon).toLocaleString("en-US")}
              />
            )}
            {dungeon.operations.length > 0 && (
              <HeroStat
                label="Tactical Operations"
                value={dungeon.operations.length}
              />
            )}
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}

/** Why a dungeon dungeons.yaml does not describe has a page at all. */
function DungeonReferencesAlert({
  dungeon,
}: Readonly<{ dungeon: DungeonDetail }>) {
  const { missions, agents, operations } = dungeon;
  const reasons = [
    missions.length === 1 && "a mission sends pilots here",
    missions.length > 1 && "missions send pilots here",
    agents.length === 1 && "an agent is stationed here",
    agents.length > 1 && "agents are stationed here",
    operations.length > 0 && "a tactical operation runs here",
  ].filter(Boolean);
  return (
    <Alert variant="light" color="gray" icon={<IconInfoCircle />}>
      The Static Data Export does not describe this dungeon — it is known only
      because {reasons.join(", and ")}. Its name, layout and description live
      only in the game client.
    </Alert>
  );
}

function shipRestrictionsSummary(dungeon: DungeonDetail): string {
  if (dungeon.restrictions.length > 0) {
    return `${plural(allowedShipCount(dungeon), "ship")} allowed`;
  }
  // dungeons.yaml lists no restriction: open to any ship. Without an entry
  // there, nothing is known either way.
  return dungeon.described ? "None" : notAvailableText;
}

function DungeonOverview({ dungeon }: Readonly<{ dungeon: DungeonDetail }>) {
  const { archetype, restrictions, missions, agents, operations } = dungeon;
  const usedBy = [
    missions.length > 0 && plural(missions.length, "mission"),
    agents.length > 0 && plural(agents.length, "agent"),
    operations.length > 0 && plural(operations.length, "operation"),
  ]
    .filter(Boolean)
    .join(" · ");
  const systems = [
    ...new Set(agents.map((a) => a.solarSystemName ?? String(a.solarSystemId))),
  ];
  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <SectionHeading icon={<IconInfoCircle size={18} />}>
          Dungeon
        </SectionHeading>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          <StatCard label="Dungeon ID" value={dungeon.dungeonId} />
          <StatCard label="Name" value={dungeon.name ?? notAvailableText} />
          <StatCard
            label="Faction"
            value={
              dungeon.faction ? (
                <FactionLabel faction={dungeon.faction} />
              ) : (
                notAvailableText
              )
            }
          />
          <StatCard
            label="Archetype"
            value={
              archetype
                ? (archetype.title ?? `Archetype ${archetype.archetypeId}`)
                : notAvailableText
            }
            sub={
              archetype
                ? `ID ${archetype.archetypeId} · ${plural(dungeon.related.length + 1, "site")}`
                : undefined
            }
          />
          <StatCard
            label="Ship Restrictions"
            value={shipRestrictionsSummary(dungeon)}
            sub={
              restrictions.length > 0
                ? plural(restrictions.length, "type list")
                : undefined
            }
          />
          <StatCard label="Used By" value={usedBy || notAvailableText} />
        </SimpleGrid>
      </Stack>

      {archetype?.description && (
        <Stack gap="sm">
          <SectionHeading icon={<IconSitemap size={18} />}>
            {archetype.title ?? "Archetype"}
          </SectionHeading>
          <Paper withBorder radius="md" p="md">
            <MissionText text={archetype.description} />
          </Paper>
        </Stack>
      )}

      {systems.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconMapPin size={18} />}>
            Locations
          </SectionHeading>
          <Text size="sm" c="dimmed">
            Agents stationed in this dungeon place it in {systems.join(", ")}.
          </Text>
        </Stack>
      )}
    </Stack>
  );
}

export default function DungeonPage({
  dungeon,
  history,
}: Readonly<{ dungeon: DungeonDetail; history: EntityHistoryData | null }>) {
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(DUNGEON_PAGE_TABS)
      .withDefault(DEFAULT_DUNGEON_PAGE_TAB)
      .withOptions({ history: "replace" }),
  );

  const name = dungeonDisplayName(dungeon);
  const hasDescription =
    dungeon.description !== null || dungeon.gameplayDescription !== null;
  const available: Record<string, boolean> = {
    description: hasDescription,
    "ship-restrictions": dungeon.restrictions.length > 0,
    missions: dungeon.missions.length > 0,
    agents: dungeon.agents.length > 0,
    operations: dungeon.operations.length > 0,
    related: dungeon.related.length > 0,
  };
  const selectedTab =
    available[activeTab] === false ? DEFAULT_DUNGEON_PAGE_TAB : activeTab;

  const archetypeTitle = dungeon.archetype?.title ?? null;

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <Breadcrumbs>
          <Anchor component={Link} href="/dungeons" size="sm">
            Dungeons
          </Anchor>
          {archetypeTitle && (
            <Text size="sm" c="dimmed">
              {archetypeTitle}
            </Text>
          )}
          <Text size="sm">{name}</Text>
        </Breadcrumbs>

        <DungeonHero dungeon={dungeon} />

        {!dungeon.described && <DungeonReferencesAlert dungeon={dungeon} />}

        <Tabs
          value={selectedTab}
          onChange={(value) => {
            if (isDungeonPageTab(value)) void setActiveTab(value);
          }}
          variant="outline"
          keepMounted={false}
        >
          <Tabs.List>
            <Tabs.Tab
              value="overview"
              leftSection={<IconInfoCircle size={16} />}
            >
              Overview
            </Tabs.Tab>
            {available.description && (
              <Tabs.Tab
                value="description"
                leftSection={<IconFileText size={16} />}
              >
                Description
              </Tabs.Tab>
            )}
            {available["ship-restrictions"] && (
              <Tabs.Tab
                value="ship-restrictions"
                leftSection={<IconListCheck size={16} />}
              >
                Ship Restrictions
              </Tabs.Tab>
            )}
            {available.missions && (
              <Tabs.Tab value="missions" leftSection={<IconTarget size={16} />}>
                Missions ({dungeon.missions.length})
              </Tabs.Tab>
            )}
            {available.agents && (
              <Tabs.Tab value="agents" leftSection={<IconUsers size={16} />}>
                Agents ({dungeon.agents.length})
              </Tabs.Tab>
            )}
            {available.operations && (
              <Tabs.Tab
                value="operations"
                leftSection={<IconSwords size={16} />}
              >
                Tactical Operations
              </Tabs.Tab>
            )}
            {available.related && (
              <Tabs.Tab value="related" leftSection={<IconSitemap size={16} />}>
                Same Archetype ({dungeon.related.length})
              </Tabs.Tab>
            )}
            <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
              History
            </Tabs.Tab>
          </Tabs.List>

          {/* Overview */}
          <Tabs.Panel value="overview" pt="lg">
            <DungeonOverview dungeon={dungeon} />
          </Tabs.Panel>

          {/* Description */}
          {available.description && (
            <Tabs.Panel value="description" pt="lg">
              <Stack gap="md">
                {dungeon.description !== null && (
                  <Paper withBorder radius="md" p="md">
                    <Stack gap="xs">
                      <Text fw={700} size="sm">
                        Description
                      </Text>
                      <MissionText text={dungeon.description} />
                    </Stack>
                  </Paper>
                )}
                {dungeon.gameplayDescription !== null && (
                  <Paper withBorder radius="md" p="md">
                    <Stack gap="xs">
                      <Text fw={700} size="sm">
                        Gameplay
                      </Text>
                      <MissionText text={dungeon.gameplayDescription} />
                    </Stack>
                  </Paper>
                )}
              </Stack>
            </Tabs.Panel>
          )}

          {/* Ship restrictions */}
          {available["ship-restrictions"] && (
            <Tabs.Panel value="ship-restrictions" pt="lg">
              <Stack gap="md">
                <Text size="sm" c="dimmed">
                  Only ships in{" "}
                  {dungeon.restrictions.length === 1
                    ? "this type list"
                    : "these type lists"}{" "}
                  can take the dungeon&apos;s acceleration gate.
                </Text>
                {dungeon.restrictions.map((restriction) => (
                  <RestrictionPanel
                    key={restriction.typeListId}
                    restriction={restriction}
                  />
                ))}
              </Stack>
            </Tabs.Panel>
          )}

          {/* Missions */}
          {available.missions && (
            <Tabs.Panel value="missions" pt="lg">
              <DataTable
                data={dungeon.missions}
                columns={missionColumns}
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
            </Tabs.Panel>
          )}

          {/* Agents in space */}
          {available.agents && (
            <Tabs.Panel value="agents" pt="lg">
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Agents who sit in space inside this dungeon rather than in a
                  station.
                </Text>
                <DataTable
                  data={dungeon.agents}
                  columns={agentColumns}
                  rowId={(row) => row.agent.characterId}
                  withGlobalFilter
                  withColumnVisibility
                  withPagination
                  defaultPageSize={25}
                  initialSort={{ columnId: "agent", direction: "asc" }}
                  verticalSpacing="xs"
                  highlightOnHover
                  striped
                />
              </Stack>
            </Tabs.Panel>
          )}

          {/* Mercenary Den tactical operations */}
          {available.operations && (
            <Tabs.Panel value="operations" pt="lg">
              <Stack gap="md">
                {dungeon.operations.map((operation) => (
                  <Paper
                    key={operation.mercenaryTacticalOperationId}
                    withBorder
                    radius="md"
                    p="md"
                  >
                    <Stack gap="sm">
                      <Group gap="sm">
                        <Title order={4}>{operation.name}</Title>
                        <Badge variant="light" color="gray">
                          ID {operation.mercenaryTacticalOperationId}
                        </Badge>
                      </Group>
                      <Text size="sm">{operation.description}</Text>
                      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                        <StatCard
                          label="Anarchy"
                          value={`${operation.anarchyImpact > 0 ? "+" : ""}${operation.anarchyImpact}`}
                        />
                        <StatCard
                          label="Development"
                          value={`${operation.developmentImpact > 0 ? "+" : ""}${operation.developmentImpact}`}
                        />
                        <StatCard
                          label="Infomorph Bonus"
                          value={`${operation.infomorphBonus > 0 ? "+" : ""}${operation.infomorphBonus}`}
                        />
                      </SimpleGrid>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Tabs.Panel>
          )}

          {/* Same archetype */}
          {available.related && (
            <Tabs.Panel value="related" pt="lg">
              <DataTable
                data={dungeon.related}
                columns={relatedColumns}
                rowId={(row) => row.dungeonId}
                withGlobalFilter
                withPagination
                defaultPageSize={25}
                initialSort={{ columnId: "name", direction: "asc" }}
                verticalSpacing="xs"
                highlightOnHover
                striped
              />
            </Tabs.Panel>
          )}

          <Tabs.Panel value="history" pt="lg">
            <EmbeddedEntityHistory history={history} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
