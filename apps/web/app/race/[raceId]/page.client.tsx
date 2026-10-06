"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Anchor,
  Badge,
  Box,
  Container,
  Group,
  Image,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  Title,
} from "@mantine/core";
import {
  IconBuildingSkyscraper,
  IconBuildingStore,
  IconDna,
  IconFileText,
  IconHierarchy3,
  IconHistory,
  IconInfoCircle,
  IconListCheck,
  IconPackage,
  IconRocket,
  IconSchool,
  IconUsersGroup,
  IconUserStar,
} from "@tabler/icons-react";
import { parseAsBoolean, parseAsStringLiteral, useQueryState } from "nuqs";

import type { DataTableColumn } from "@jitaspace/datatable";
import {
  CharacterAnchor,
  FactionAnchor,
  RegionAnchor,
  SolarSystemAnchor,
  StationAnchor,
  TypeAnchor,
} from "@jitaspace/eve-components";
import { SHIP_TREE_FACTIONS } from "@jitaspace/ship-tree/factions";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  BloodlineAnchor,
  CategoryAnchor,
  CharacterAvatar,
  EveIconAvatar,
  FactionAvatar,
  GroupAnchor,
  SkillBar,
  SolarSystemSecurityStatusBadge,
  TypeAvatar,
} from "@jitaspace/ui";

import type { RacePageTab } from "./tabs";
import type {
  CharacterAttribute,
  RaceAttributeValues,
  RaceCloneSkillRow,
  RaceCorporationRow,
  RaceItemRow,
  RaceLocation,
  RacePageData,
  RaceSkillRow,
  RaceStartingSkillRow,
  RaceStationRow,
  RaceTableName,
  RaceTables,
} from "./types";
import type { EntityHistoryData } from "~/lib/history-entity-page";
import { DataTable } from "~/components/DataTable";
import {
  CorporationLink,
  HeroCard,
  HeroStat,
  LocationTrail,
  SectionHeading,
  StatCard,
  useEntityTable,
  YesNoBadge,
} from "~/components/EntityPage";
import { MailMessageViewer } from "~/components/EveMail";
import { SHIP_TREE_OMEGA_PARAM } from "~/components/ShipTree/constants";
import { LazyShipTreeTab } from "~/components/ShipTree/LazyShipTreeTab";
import { formatInteger as formatCount, formatCountOf } from "~/lib/format";
import { EmbeddedEntityHistory } from "../../history/EntityHistory";
import { CHARACTER_ATTRIBUTES } from "./constants";
import { DEFAULT_RACE_PAGE_TAB, isRacePageTab, RACE_PAGE_TABS } from "./tabs";

export type PageProps = RacePageData & {
  /** The race's change history, read with the page; null if that failed. */
  history: EntityHistoryData | null;
};

/** A stable empty table, so a loading tab does not hand DataTable a new array per render. */
const NO_ROWS: never[] = [];

/** The tabs that list rows the page does not carry, and the tables each fetches. */
const TABLES_FOR_TAB: Partial<Record<RacePageTab, RaceTableName[]>> = {
  skills: ["alphaSkills", "racialSkills"],
  items: ["items"],
  corporations: ["corporations"],
  stations: ["stations"],
};

/**
 * One of the race's long lists, from the CDN-cached `/api/race/[raceId]/[table]`:
 * fetched once the open tab lists it, and only if it has rows.
 */
function useRaceTable<K extends RaceTableName>(
  race: Pick<PageProps, "raceId" | "counts">,
  table: K,
  fetched: ReadonlySet<RaceTableName>,
) {
  return useEntityTable<RaceTables[K]>(
    `/api/race/${race.raceId}/${table}`,
    fetched.has(table) && race.counts[table] > 0,
  );
}

const ATTRIBUTE_LABELS: Record<CharacterAttribute, string> = {
  intelligence: "Intelligence",
  perception: "Perception",
  charisma: "Charisma",
  willpower: "Willpower",
  memory: "Memory",
};

/** The first sentence of a description, for the hero's tagline. */
function firstSentence(text: string): string {
  return /^.*?[.!?](?=\s|$)/s.exec(text)?.[0] ?? text;
}

function TypeLink({
  typeId,
  name,
}: Readonly<{ typeId: number; name: string }>) {
  return (
    <Group gap="xs" wrap="nowrap">
      <TypeAvatar typeId={typeId} size="sm" />
      <TypeAnchor typeId={typeId}>{name}</TypeAnchor>
    </Group>
  );
}

function regionCell(row: RaceLocation) {
  if (row.regionId === null) return null;
  return <RegionAnchor regionId={row.regionId}>{row.regionName}</RegionAnchor>;
}

// ---------------------------------------------------------------------------
// Bloodlines
// ---------------------------------------------------------------------------

/** Bloodline attributes run to 10; a bar is only a comparison between them. */
const ATTRIBUTE_SCALE = 10;

function AttributeBars({ values }: Readonly<{ values: RaceAttributeValues }>) {
  return (
    <SimpleGrid cols={{ base: 2, xs: 3, sm: 5 }} spacing="xs">
      {CHARACTER_ATTRIBUTES.map((attribute) => (
        <Stack key={attribute} gap={2}>
          <Group justify="space-between" gap={4} wrap="nowrap">
            <Text size="xs" c="dimmed">
              {ATTRIBUTE_LABELS[attribute]}
            </Text>
            <Text size="sm" fw={600} c="bright">
              {values[attribute]}
            </Text>
          </Group>
          <Progress
            value={Math.min(100, (values[attribute] / ATTRIBUTE_SCALE) * 100)}
            size="sm"
            aria-label={ATTRIBUTE_LABELS[attribute]}
          />
        </Stack>
      ))}
    </SimpleGrid>
  );
}

/** "+3 Charisma", one badge per attribute the ancestry raises. */
function AttributeBonuses({
  bonuses,
}: Readonly<{ bonuses: RaceAttributeValues }>) {
  const raised = CHARACTER_ATTRIBUTES.filter(
    (attribute) => bonuses[attribute] !== 0,
  );
  if (raised.length === 0) return null;
  return (
    <Group gap={4}>
      {raised.map((attribute) => (
        <Badge key={attribute} size="sm" variant="light">
          {bonuses[attribute] > 0 ? "+" : ""}
          {bonuses[attribute]} {ATTRIBUTE_LABELS[attribute]}
        </Badge>
      ))}
    </Group>
  );
}

function BloodlinesPanel({
  bloodlines,
}: Readonly<{ bloodlines: PageProps["bloodlines"] }>) {
  return (
    <Stack gap="lg">
      <Text size="sm" c="dimmed">
        The bloodlines a pilot of this race can be born into, their attributes,
        and the ancestries each offers at character creation.
      </Text>
      {bloodlines.map((bloodline) => (
        <Paper key={bloodline.bloodlineId} withBorder radius="md" p="md">
          <Stack gap="md">
            <Group align="flex-start" gap="md" wrap="nowrap">
              <EveIconAvatar
                iconId={bloodline.iconId}
                size={72}
                radius="sm"
                alt=""
              />
              <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                <BloodlineAnchor
                  bloodlineId={bloodline.bloodlineId}
                  fw={700}
                  size="lg"
                >
                  {bloodline.name}
                </BloodlineAnchor>
                <Group gap="lg">
                  <Group gap={6} wrap="nowrap">
                    <Text size="xs" c="dimmed">
                      Corporation
                    </Text>
                    <CorporationLink
                      corporationId={bloodline.corporation.id}
                      name={bloodline.corporation.name}
                    />
                  </Group>
                  {bloodline.shipType && (
                    <Group gap={6} wrap="nowrap">
                      <Text size="xs" c="dimmed">
                        Corvette
                      </Text>
                      <TypeLink
                        typeId={bloodline.shipType.id}
                        name={bloodline.shipType.name}
                      />
                    </Group>
                  )}
                </Group>
                <Text
                  size="sm"
                  c="dimmed"
                  lineClamp={4}
                  title={bloodline.description}
                >
                  {bloodline.description}
                </Text>
              </Stack>
            </Group>

            <AttributeBars values={bloodline.attributes} />

            {bloodline.ancestries.length > 0 && (
              <Stack gap="xs">
                <Text
                  size="xs"
                  c="dimmed"
                  tt="uppercase"
                  fw={700}
                  style={{ letterSpacing: "0.05em" }}
                >
                  Ancestries
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                  {bloodline.ancestries.map((ancestry) => (
                    <Paper
                      key={ancestry.ancestryId}
                      withBorder
                      radius="md"
                      p="sm"
                    >
                      <Stack gap={6}>
                        <Group gap="sm" wrap="nowrap">
                          <EveIconAvatar
                            iconId={ancestry.iconId}
                            size="md"
                            alt=""
                          />
                          <Text fw={600} c="bright">
                            {ancestry.name}
                          </Text>
                        </Group>
                        <AttributeBonuses bonuses={ancestry.bonuses} />
                        {ancestry.shortDescription && (
                          <Text size="xs" fs="italic" c="dimmed">
                            {ancestry.shortDescription}
                          </Text>
                        )}
                        <Text
                          size="xs"
                          c="dimmed"
                          lineClamp={4}
                          title={ancestry.description}
                        >
                          {ancestry.description}
                        </Text>
                      </Stack>
                    </Paper>
                  ))}
                </SimpleGrid>
              </Stack>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Schools
// ---------------------------------------------------------------------------

function SchoolsPanel({
  schools,
}: Readonly<{ schools: PageProps["schools"] }>) {
  return (
    <Stack gap="lg">
      <Text size="sm" c="dimmed">
        The academies a new pilot of this race graduates from. Each belongs to a
        corporation, starts its graduates at one of its stations, and has career
        agents to introduce them to their trade. <b>Starter Space</b> copies of
        a school start pilots in the New Player Experience instead.
      </Text>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {schools.map((school) => (
          <Paper key={school.schoolId} withBorder radius="md" p="md">
            <Stack gap="sm">
              <Group gap="md" wrap="nowrap" align="flex-start">
                <EveIconAvatar
                  iconId={school.iconId}
                  size={56}
                  radius="sm"
                  alt=""
                />
                <Stack gap={2} style={{ minWidth: 0 }}>
                  <Group gap="xs">
                    <Text fw={700} c="bright">
                      {school.name}
                    </Text>
                    {school.isStarterSpaceSchool && (
                      <Badge size="xs" variant="light" color="grape">
                        Starter Space
                      </Badge>
                    )}
                  </Group>
                  {school.title && (
                    <Text size="sm" c="dimmed">
                      {school.title}
                    </Text>
                  )}
                  {school.corporation && (
                    <CorporationLink
                      corporationId={school.corporation.id}
                      name={school.corporation.name}
                    />
                  )}
                </Stack>
              </Group>

              {school.description && (
                <Text
                  size="sm"
                  c="dimmed"
                  lineClamp={4}
                  title={school.description}
                >
                  {school.description}
                </Text>
              )}
              {school.characterDescription && (
                <Text
                  size="xs"
                  fs="italic"
                  c="dimmed"
                  lineClamp={3}
                  title={school.characterDescription}
                >
                  {school.characterDescription}
                </Text>
              )}

              {school.homeSystem && (
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    Located in
                  </Text>
                  <LocationTrail location={school.homeSystem} />
                </Group>
              )}

              {school.startingStations.length > 0 && (
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    Starting{" "}
                    {school.startingStations.length === 1
                      ? "station"
                      : "stations"}
                  </Text>
                  {school.startingStations.map((station) => (
                    <Group key={station.stationId} gap={6} wrap="nowrap">
                      <SolarSystemSecurityStatusBadge
                        securityStatus={station.securityStatus}
                        size="sm"
                      />
                      <StationAnchor stationId={station.stationId} size="sm">
                        {station.stationName}
                      </StationAnchor>
                    </Group>
                  ))}
                </Stack>
              )}

              {school.careerAgents.length > 0 && (
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">
                    Career agents
                  </Text>
                  <Group gap="sm">
                    {school.careerAgents.map((agent) => (
                      <Group key={agent.id} gap={6} wrap="nowrap">
                        <CharacterAvatar characterId={agent.id} size="sm" />
                        <CharacterAnchor characterId={agent.id} size="sm">
                          {agent.name}
                        </CharacterAnchor>
                      </Group>
                    ))}
                  </Group>
                </Stack>
              )}
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

function skillNameCell(row: RaceSkillRow) {
  return <TypeLink typeId={row.typeId} name={row.name} />;
}

const attributeLabel = (attribute: CharacterAttribute | null) =>
  attribute === null ? null : ATTRIBUTE_LABELS[attribute];

/** Columns every skill table shares: name, group, rank and attributes. */
function skillColumns<T extends RaceSkillRow>(
  levelColumns: DataTableColumn<T>[],
): DataTableColumn<T>[] {
  return [
    {
      id: "name",
      header: "Skill",
      accessor: "name",
      sortable: true,
      enableHiding: false,
      cell: skillNameCell,
    },
    {
      id: "group",
      header: "Group",
      accessor: "groupName",
      sortable: true,
      filter: { type: "select" },
      cell: (row) =>
        row.groupId === null ? (
          row.groupName
        ) : (
          <GroupAnchor groupId={row.groupId}>{row.groupName}</GroupAnchor>
        ),
    },
    ...levelColumns,
    {
      id: "rank",
      header: "Rank",
      accessor: "rank",
      sortable: true,
      align: "right",
      filter: { type: "range", min: 0 },
      cell: (row) => (row.rank === null ? "–" : `${row.rank}×`),
    },
    {
      id: "primary",
      header: "Primary",
      accessor: (row) => attributeLabel(row.primaryAttribute),
      sortable: true,
      filter: { type: "select" },
    },
    {
      id: "secondary",
      header: "Secondary",
      accessor: (row) => attributeLabel(row.secondaryAttribute),
      sortable: true,
      filter: { type: "select" },
    },
  ];
}

const startingSkillColumns = skillColumns<RaceStartingSkillRow>([
  {
    id: "level",
    header: "Level",
    accessor: "level",
    sortable: true,
    filter: { type: "range", min: 0, max: 5, step: 1 },
    cell: (row) => (
      <Group gap="xs" wrap="nowrap">
        <SkillBar activeLevel={row.level} requiredLevel={0} />
        <Text size="xs" c="dimmed">
          {row.level}
        </Text>
      </Group>
    ),
  },
  {
    id: "skillPoints",
    header: "Skill points",
    accessor: "skillPoints",
    sortable: true,
    align: "right",
    cell: (row) =>
      row.skillPoints === null ? "–" : formatCount(row.skillPoints),
  },
]);

const cloneSkillColumns = skillColumns<RaceCloneSkillRow>([
  {
    id: "maxLevel",
    header: "Max level",
    accessor: "maxLevel",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0, max: 5, step: 1 },
  },
]);

const racialSkillColumns = skillColumns<RaceSkillRow>([]);

/** A fetched table's rows and whether they are still on their way. */
interface FetchedRows<T> {
  data: T[] | undefined;
  isPending: boolean;
}

function SkillsPanel({
  startingSkills,
  cloneGrade,
  counts,
  alphaSkills,
  racialSkills,
}: Readonly<
  Pick<PageProps, "startingSkills" | "cloneGrade" | "counts"> & {
    alphaSkills: FetchedRows<RaceCloneSkillRow>;
    racialSkills: FetchedRows<RaceSkillRow>;
  }
>) {
  const startingSkillPoints = startingSkills.reduce(
    (total, skill) => total + (skill.skillPoints ?? 0),
    0,
  );
  const trainedSkills = startingSkills.filter((skill) => skill.level > 0);

  return (
    <Stack gap="xl">
      {startingSkills.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconListCheck size={18} />}>
            Starting skills
          </SectionHeading>
          <Text size="sm" c="dimmed">
            The skills a new character of this race is created with. Level 0
            skills are injected but not yet trained.
          </Text>
          <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
            <StatCard
              label="Skills"
              value={formatCount(startingSkills.length)}
              sub={`${formatCount(trainedSkills.length)} trained`}
            />
            <StatCard
              label="Skill points"
              value={formatCount(startingSkillPoints)}
            />
            <StatCard
              label="Highest level"
              value={Math.max(...startingSkills.map((skill) => skill.level))}
            />
          </SimpleGrid>
          <DataTable
            data={startingSkills}
            columns={startingSkillColumns}
            rowId={(row) => row.typeId}
            initialSort={{ columnId: "level", direction: "desc" }}
            withGlobalFilter
            withColumnVisibility
            withPagination
            defaultPageSize={25}
            verticalSpacing="xs"
            highlightOnHover
            striped
          />
        </Stack>
      )}

      {cloneGrade && counts.alphaSkills > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconDna size={18} />}>
            Alpha clone skills
          </SectionHeading>
          <Text size="sm" c="dimmed">
            What an Alpha clone of this race (the <b>{cloneGrade.name}</b> clone
            grade) can train without Omega status, and how far.
          </Text>
          <DataTable
            data={alphaSkills.data ?? NO_ROWS}
            isLoading={alphaSkills.isPending}
            columns={cloneSkillColumns}
            rowId={(row) => row.typeId}
            initialSort={{ columnId: "group", direction: "asc" }}
            withGlobalFilter
            withColumnVisibility
            withPagination
            defaultPageSize={25}
            verticalSpacing="xs"
            highlightOnHover
            striped
          />
        </Stack>
      )}

      {counts.racialSkills > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconRocket size={18} />}>
            Racial skills
          </SectionHeading>
          <Text size="sm" c="dimmed">
            Skills the game data assigns to this race, such as the ones its
            ships require.
          </Text>
          <DataTable
            data={racialSkills.data ?? NO_ROWS}
            isLoading={racialSkills.isPending}
            columns={racialSkillColumns}
            rowId={(row) => row.typeId}
            initialSort={{ columnId: "group", direction: "asc" }}
            withGlobalFilter
            withPagination
            defaultPageSize={25}
            verticalSpacing="xs"
            highlightOnHover
            striped
          />
        </Stack>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Ships
// ---------------------------------------------------------------------------

function ShipsPanel({
  shipClasses,
  starterShipId,
  corvetteIds,
}: Readonly<{
  shipClasses: PageProps["shipClasses"];
  starterShipId: number | null;
  corvetteIds: Set<number>;
}>) {
  return (
    <Stack gap="lg">
      <Text size="sm" c="dimmed">
        Every published hull built by this race, by class, from the smallest to
        the largest.
      </Text>
      {/* Columns, not a grid: a class holds one hull or fourteen, and a grid
          row would stretch every card to its tallest. */}
      <Box
        style={{
          columns: "3 260px",
          columnGap: "var(--mantine-spacing-sm)",
        }}
      >
        {shipClasses.map((shipClass) => (
          <Paper
            key={shipClass.groupId}
            withBorder
            radius="md"
            p="sm"
            mb="sm"
            style={{ breakInside: "avoid" }}
          >
            <Stack gap="xs">
              <Group justify="space-between" wrap="nowrap">
                <GroupAnchor groupId={shipClass.groupId} fw={700}>
                  {shipClass.name}
                </GroupAnchor>
                <Badge size="sm" variant="light" color="gray">
                  {formatCount(shipClass.ships.length)}
                </Badge>
              </Group>
              {shipClass.ships.map((ship) => (
                <Group key={ship.typeId} gap="xs" wrap="nowrap">
                  <TypeAvatar typeId={ship.typeId} size="md" />
                  <Stack gap={0} style={{ minWidth: 0 }}>
                    <TypeAnchor typeId={ship.typeId} size="sm">
                      {ship.name}
                    </TypeAnchor>
                    <Group gap={4}>
                      {ship.metaGroupName && (
                        <Text size="xs" c="dimmed">
                          {ship.metaGroupName}
                        </Text>
                      )}
                      {ship.typeId === starterShipId && (
                        <Badge size="xs" variant="light" color="teal">
                          Starter ship
                        </Badge>
                      )}
                      {ship.typeId !== starterShipId &&
                        corvetteIds.has(ship.typeId) && (
                          <Badge size="xs" variant="light" color="teal">
                            Bloodline corvette
                          </Badge>
                        )}
                    </Group>
                  </Stack>
                </Group>
              ))}
            </Stack>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Items, corporations, stations
// ---------------------------------------------------------------------------

const itemColumns: DataTableColumn<RaceItemRow>[] = [
  {
    id: "name",
    header: "Item",
    accessor: "name",
    sortable: true,
    enableHiding: false,
    cell: (row) => <TypeLink typeId={row.typeId} name={row.name} />,
  },
  {
    id: "group",
    header: "Group",
    accessor: "groupName",
    sortable: true,
    filter: { type: "select" },
    cell: (row) => (
      <GroupAnchor groupId={row.groupId}>{row.groupName}</GroupAnchor>
    ),
  },
  {
    id: "category",
    header: "Category",
    accessor: "categoryName",
    sortable: true,
    filter: { type: "select" },
    cell: (row) => (
      <CategoryAnchor categoryId={row.categoryId}>
        {row.categoryName}
      </CategoryAnchor>
    ),
  },
  {
    id: "metaGroup",
    header: "Meta group",
    accessor: "metaGroupName",
    sortable: true,
    filter: { type: "select" },
  },
  {
    id: "techLevel",
    header: "Tech level",
    accessor: "techLevel",
    sortable: true,
    align: "right",
    defaultVisible: false,
  },
  {
    id: "published",
    header: "Published",
    accessor: "published",
    sortable: true,
    filter: { type: "boolean" },
    cell: (row) => <YesNoBadge value={row.published} />,
  },
];

function ItemsPanel({
  items,
  total,
  isLoading,
}: Readonly<{
  items: RaceItemRow[] | undefined;
  total: number;
  isLoading: boolean;
}>) {
  const [includeUnpublished, setIncludeUnpublished] = useState(false);
  const rows = useMemo(() => {
    if (!items) return NO_ROWS;
    return includeUnpublished ? items : items.filter((item) => item.published);
  }, [items, includeUnpublished]);

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="flex-start">
        <Text size="sm" c="dimmed" style={{ flex: 1, minWidth: 240 }}>
          Ships, modules, SKINs, apparel and everything else the game data
          attributes to this race. Unpublished items never reach players: NPC
          hulls, retired items and developer placeholders.
        </Text>
        <Switch
          checked={includeUnpublished}
          onChange={(event) =>
            setIncludeUnpublished(event.currentTarget.checked)
          }
          label={`Include unpublished (${formatCount(total)} items in all)`}
        />
      </Group>
      <DataTable
        data={rows}
        isLoading={isLoading}
        columns={itemColumns}
        rowId={(row) => row.typeId}
        initialSort={{ columnId: "name", direction: "asc" }}
        emptyText="This race has no published items."
        withGlobalFilter
        withColumnVisibility
        withPagination
        defaultPageSize={50}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    </Stack>
  );
}

/** How a corporation relates to the race, for display and filtering. */
function corporationRelation(row: RaceCorporationRow) {
  if (row.isRaceCorporation && row.acceptsRace) return "Race, accepts";
  if (row.isRaceCorporation) return "Race";
  return "Accepts";
}

const corporationColumns: DataTableColumn<RaceCorporationRow>[] = [
  {
    id: "name",
    header: "Corporation",
    accessor: "name",
    sortable: true,
    enableHiding: false,
    cell: (row) => (
      <CorporationLink corporationId={row.corporationId} name={row.name} />
    ),
  },
  {
    id: "ticker",
    header: "Ticker",
    accessor: "ticker",
    sortable: true,
    cell: (row) => `[${row.ticker}]`,
  },
  {
    id: "relation",
    header: "Relation",
    accessor: corporationRelation,
    sortable: true,
    filter: { type: "select" },
  },
  {
    id: "faction",
    header: "Faction",
    accessor: "factionName",
    sortable: true,
    filter: { type: "select" },
    cell: (row) =>
      row.factionId === null ? null : (
        <FactionAnchor factionId={row.factionId}>
          {row.factionName ?? row.factionId}
        </FactionAnchor>
      ),
  },
  {
    id: "members",
    header: "Members",
    accessor: "memberCount",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    cell: (row) => formatCount(row.memberCount),
  },
  {
    id: "stations",
    header: "Stations",
    accessor: "stations",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
  },
  {
    id: "lpOffers",
    header: "LP offers",
    accessor: "lpOffers",
    sortable: true,
    align: "right",
    filter: { type: "range", min: 0 },
    cell: (row) =>
      row.lpOffers > 0 ? (
        <Anchor component={Link} href={`/lp-store/${row.corporationId}`}>
          {formatCount(row.lpOffers)}
        </Anchor>
      ) : (
        "–"
      ),
  },
  {
    id: "size",
    header: "Size",
    accessor: "size",
    sortable: true,
    filter: { type: "select" },
    defaultVisible: false,
  },
  {
    id: "extent",
    header: "Extent",
    accessor: "extent",
    sortable: true,
    filter: { type: "select" },
    defaultVisible: false,
  },
];

const stationColumns: DataTableColumn<RaceStationRow>[] = [
  {
    id: "name",
    header: "Station",
    accessor: "stationName",
    sortable: true,
    enableHiding: false,
    cell: (row) => (
      <StationAnchor stationId={row.stationId}>{row.stationName}</StationAnchor>
    ),
  },
  {
    id: "security",
    header: "Security",
    accessor: "securityStatus",
    sortable: true,
    filter: { type: "range", min: -1, max: 1, step: 0.1 },
    cell: (row) => (
      <SolarSystemSecurityStatusBadge
        securityStatus={row.securityStatus}
        size="sm"
      />
    ),
  },
  {
    id: "system",
    header: "System",
    accessor: "name",
    sortable: true,
    cell: (row) => (
      <SolarSystemAnchor solarSystemId={row.solarSystemId}>
        {row.name}
      </SolarSystemAnchor>
    ),
  },
  {
    id: "region",
    header: "Region",
    accessor: "regionName",
    sortable: true,
    filter: { type: "select" },
    cell: regionCell,
  },
  {
    id: "owner",
    header: "Owner",
    accessor: "ownerName",
    sortable: true,
    filter: { type: "select" },
    cell: (row) =>
      row.ownerId === null ? null : (
        <CorporationLink
          corporationId={row.ownerId}
          name={row.ownerName ?? String(row.ownerId)}
        />
      ),
  },
  {
    id: "type",
    header: "Station type",
    accessor: "typeName",
    sortable: true,
    filter: { type: "select" },
    cell: (row) => <TypeAnchor typeId={row.typeId}>{row.typeName}</TypeAnchor>,
  },
];

function StationsPanel({
  stationTypes,
  stations,
  hasStations,
  isLoading,
}: Readonly<{
  stationTypes: PageProps["stationTypes"];
  stations: RaceStationRow[] | undefined;
  hasStations: boolean;
  isLoading: boolean;
}>) {
  return (
    <Stack gap="lg">
      {stationTypes.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconBuildingStore size={18} />}>
            Station architecture
          </SectionHeading>
          <Text size="sm" c="dimmed">
            The station hulls this race builds, and the operations (plantations,
            refineries, academies, …) housed in each.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {stationTypes.map((stationType) => (
              <Paper key={stationType.typeId} withBorder radius="md" p="sm">
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <TypeAvatar typeId={stationType.typeId} size="lg" />
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <TypeAnchor typeId={stationType.typeId} fw={600}>
                      {stationType.name}
                    </TypeAnchor>
                    <Text
                      size="xs"
                      c="dimmed"
                      lineClamp={3}
                      title={stationType.operations.join(", ")}
                    >
                      {formatCountOf(
                        stationType.operations.length,
                        "operation",
                        "operations",
                      )}
                      : {stationType.operations.join(", ")}
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      )}

      {hasStations && (
        <Stack gap="sm">
          <SectionHeading icon={<IconBuildingSkyscraper size={18} />}>
            Stations
          </SectionHeading>
          <Text size="sm" c="dimmed">
            NPC stations the game assigns to this race.
          </Text>
          <DataTable
            data={stations ?? NO_ROWS}
            isLoading={isLoading}
            columns={stationColumns}
            rowId={(row) => row.stationId}
            initialSort={{ columnId: "name", direction: "asc" }}
            withGlobalFilter
            withColumnVisibility
            withPagination
            defaultPageSize={50}
            verticalSpacing="xs"
            highlightOnHover
            striped
          />
        </Stack>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

/** "GenericStorylineMissionAgent" → "Generic Storyline Mission". */
function agentTypeLabel(name: string): string {
  const label = name.replace(/Agent$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
  return label === "" ? name : label;
}

/** A labelled list of counts, each with a bar for its share of the total. */
function CountList({
  label,
  rows,
  total,
}: Readonly<{
  label: string;
  rows: { key: number | string; label: ReactNode; count: number }[];
  total: number;
}>) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap={8}>
        <Text
          size="xs"
          c="dimmed"
          tt="uppercase"
          fw={700}
          style={{ letterSpacing: "0.05em" }}
        >
          {label}
        </Text>
        {rows.map((row) => (
          <Stack key={row.key} gap={2}>
            <Group justify="space-between" gap="xs" wrap="nowrap">
              <Text size="sm" truncate>
                {row.label}
              </Text>
              <Text size="sm" fw={600} c="bright">
                {formatCount(row.count)}
              </Text>
            </Group>
            <Progress
              value={total > 0 ? (row.count / total) * 100 : 0}
              size="xs"
              aria-hidden
            />
          </Stack>
        ))}
      </Stack>
    </Paper>
  );
}

function OverviewPanel({
  race,
  publishedShips,
  publishedItems,
}: Readonly<{
  race: PageProps;
  publishedShips: number;
  publishedItems: number;
}>) {
  const ancestries = race.bloodlines.reduce(
    (total, bloodline) => total + bloodline.ancestries.length,
    0,
  );
  const startingSkillPoints = race.startingSkills.reduce(
    (total, skill) => total + (skill.skillPoints ?? 0),
    0,
  );
  const { agents } = race;
  // Zeros left out: most races have no bloodlines, schools or agents, and a
  // wall of zeros reads as missing data. Items, which every race has, stay.
  const glance = [
    {
      label: "Bloodlines",
      value: race.bloodlines.length,
      sub: formatCountOf(ancestries, "ancestry", "ancestries"),
    },
    { label: "Schools", value: race.schools.length },
    {
      label: "Ships",
      value: publishedShips,
      sub: formatCountOf(race.shipClasses.length, "class", "classes"),
    },
    { label: "Racial skills", value: race.counts.racialSkills },
    {
      label: "Items",
      value: race.counts.items,
      sub: `${formatCount(publishedItems)} published`,
    },
    { label: "NPC corporations", value: race.counts.corporations },
    {
      label: "Stations",
      value: race.counts.stations,
      sub:
        race.stationTypes.length > 0
          ? formatCountOf(
              race.stationTypes.length,
              "station type",
              "station types",
            )
          : undefined,
    },
    {
      label: "Agents",
      value: agents.total,
      sub:
        agents.locators > 0
          ? `${formatCount(agents.locators)} locators`
          : undefined,
    },
  ].filter((card) => card.value > 0 || card.label === "Items");

  return (
    <Stack gap="lg">
      <Stack gap="sm">
        <SectionHeading icon={<IconInfoCircle size={18} />}>
          Identity
        </SectionHeading>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
          <StatCard label="Race ID" value={race.raceId} />
          {race.faction && (
            <StatCard
              label="Faction"
              value={
                <Group gap="xs" wrap="nowrap">
                  <FactionAvatar factionId={race.faction.id} size="sm" />
                  <FactionAnchor factionId={race.faction.id}>
                    {race.faction.name}
                  </FactionAnchor>
                </Group>
              }
              sub={`ID ${race.faction.id}`}
            />
          )}
          {race.starterShip && (
            <StatCard
              label="Starter ship"
              value={
                <TypeLink
                  typeId={race.starterShip.id}
                  name={race.starterShip.name}
                />
              }
              sub={`ID ${race.starterShip.id}`}
            />
          )}
          {race.cloneGrade && (
            <StatCard
              label="Alpha clone grade"
              value={race.cloneGrade.name}
              sub={formatCountOf(race.counts.alphaSkills, "skill", "skills")}
            />
          )}
          {race.startingSkills.length > 0 && (
            <StatCard
              label="Starting skills"
              value={formatCount(race.startingSkills.length)}
              sub={`${formatCount(startingSkillPoints)} skill points`}
            />
          )}
        </SimpleGrid>
      </Stack>

      <Stack gap="sm">
        <SectionHeading icon={<IconUsersGroup size={18} />}>
          At a glance
        </SectionHeading>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
          {glance.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={formatCount(card.value)}
              sub={card.sub}
            />
          ))}
        </SimpleGrid>
      </Stack>

      {race.factions.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconHierarchy3 size={18} />}>
            Factions
          </SectionHeading>
          <Text size="sm" c="dimmed">
            The race&apos;s own faction, and every faction that counts it among
            its member races.
          </Text>
          <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
            {race.factions.map((faction) => (
              <Paper key={faction.factionId} withBorder radius="md" p="sm">
                <Group gap="sm" wrap="nowrap">
                  <FactionAvatar factionId={faction.factionId} size="md" />
                  <Stack gap={0} style={{ minWidth: 0 }}>
                    <FactionAnchor factionId={faction.factionId} fw={600}>
                      {faction.name}
                    </FactionAnchor>
                    <Text size="xs" c="dimmed">
                      {faction.isHomeFaction ? "Home faction" : "Member race"}
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>
      )}

      {agents.total > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconUserStar size={18} />}>
            Agents
          </SectionHeading>
          <Text size="sm" c="dimmed">
            NPC mission agents of this race, by level and by the corporation
            division they work for.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <CountList
              label="By level"
              total={agents.total}
              rows={agents.byLevel.map((entry) => ({
                key: entry.level,
                label: `Level ${entry.level}`,
                count: entry.count,
              }))}
            />
            <CountList
              label="By division"
              total={agents.total}
              rows={agents.byDivision.map((division) => ({
                key: division.id,
                label: division.name,
                count: division.count,
              }))}
            />
            <CountList
              label="By type"
              total={agents.total}
              rows={agents.byType.map((agentType) => ({
                key: agentType.id,
                label: agentTypeLabel(agentType.name),
                count: agentType.count,
              }))}
            />
          </SimpleGrid>
        </Stack>
      )}

      {race.itemCategories.length > 0 && (
        <Stack gap="sm">
          <SectionHeading icon={<IconPackage size={18} />}>
            Items by category
          </SectionHeading>
          <Paper withBorder radius="md" p="sm">
            <SimpleGrid
              cols={{ base: 1, sm: 2, md: 3 }}
              spacing="xl"
              verticalSpacing={6}
            >
              {race.itemCategories.map((category) => (
                <Group
                  key={category.categoryId}
                  justify="space-between"
                  gap="xs"
                  wrap="nowrap"
                >
                  <CategoryAnchor categoryId={category.categoryId} size="sm">
                    {category.name}
                  </CategoryAnchor>
                  <Group gap={6} wrap="nowrap">
                    <Text size="xs" c="dimmed">
                      {formatCount(category.published)} published
                    </Text>
                    <Text size="sm" fw={600} c="bright">
                      {formatCount(category.total)}
                    </Text>
                  </Group>
                </Group>
              ))}
            </SimpleGrid>
          </Paper>
        </Stack>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * The faction that is the race's own: its home faction, which ESI gives only
 * the four empires, or else the one faction that counts it as a member (the
 * Triglavian Collective). Jove, a member of four, has none.
 */
function ownFactionId(race: PageProps): number | null {
  if (race.faction) return race.faction.id;
  const [only, ...others] = race.factions;
  return only && others.length === 0 ? only.factionId : null;
}

/** The tabs this race has something to show in. */
function visibleRaceTabs(
  race: PageProps,
  {
    hasDescription,
    hasShipTree,
  }: { hasDescription: boolean; hasShipTree: boolean },
): Set<string> {
  const { counts } = race;
  const hasSkills =
    race.startingSkills.length > 0 ||
    race.cloneGrade !== null ||
    counts.racialSkills > 0;
  const shown: Record<RacePageTab, boolean> = {
    overview: true,
    description: hasDescription,
    bloodlines: race.bloodlines.length > 0,
    schools: race.schools.length > 0,
    skills: hasSkills,
    ships: race.shipClasses.length > 0,
    "ship-tree": hasShipTree,
    items: counts.items > 0,
    corporations: counts.corporations > 0,
    // The station architecture alone fills the tab.
    stations: counts.stations > 0 || race.stationTypes.length > 0,
    history: true,
  };
  return new Set(RACE_PAGE_TABS.filter((tab) => shown[tab]));
}

/** The race's emblem, or the closest thing it has to one. */
function HeroImage({
  race,
  factionId,
}: Readonly<{ race: PageProps; factionId: number | null }>) {
  // Icon 0 is the SDE's "no icon" (ORE carries it).
  if (race.iconId !== null && race.iconId > 0) {
    return (
      <EveIconAvatar
        iconId={race.iconId}
        size={150}
        radius={0}
        alt={race.name}
      />
    );
  }
  if (factionId !== null) {
    return (
      <FactionAvatar
        factionId={factionId}
        size={150}
        radius={0}
        alt={race.name}
      />
    );
  }
  // Then a hull: the starter ship, or one of the race's largest. Classes of
  // unknown mass sort last, so take the last class with one.
  const largest =
    race.shipClasses.findLast((shipClass) => shipClass.mass !== null) ??
    race.shipClasses.at(-1);
  const shipId = race.starterShip?.id ?? largest?.ships[0]?.typeId;
  if (shipId !== undefined) {
    return (
      <Image
        src={`https://images.evetech.net/types/${shipId}/render?size=256`}
        alt={race.name}
        w={150}
        h={150}
        fit="contain"
      />
    );
  }
  return <EveIconAvatar iconId={0} size={150} radius={0} alt={race.name} />;
}

export default function RacePage(race: Readonly<PageProps>) {
  const { counts, history } = race;
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(RACE_PAGE_TABS)
      .withDefault(DEFAULT_RACE_PAGE_TAB)
      .withOptions({ history: "replace" }),
  );
  // Written by the Ship Tree tab; the page only clears it (see the tab change).
  const [, setShipTreeOmega] = useQueryState(
    SHIP_TREE_OMEGA_PARAM,
    parseAsBoolean,
  );

  const description = race.description.trim();
  // Some races' description is only their name ("Rogue Drones").
  const hasDescription =
    description !== "" &&
    description.toLowerCase() !== race.name.trim().toLowerCase();
  const publishedShips = race.shipClasses.reduce(
    (total, shipClass) => total + shipClass.ships.length,
    0,
  );
  const publishedItems = race.itemCategories.reduce(
    (total, category) => total + category.published,
    0,
  );
  const corvetteIds = useMemo(
    () =>
      new Set(
        race.bloodlines.flatMap((bloodline) =>
          bloodline.shipType ? [bloodline.shipType.id] : [],
        ),
      ),
    [race.bloodlines],
  );
  const isPlayable = race.startingSkills.length > 0;
  const factionId = ownFactionId(race);
  const shipTreeFaction = SHIP_TREE_FACTIONS.find(
    (entry) => entry.id === factionId,
  );

  const visibleTabs = visibleRaceTabs(race, {
    hasDescription,
    hasShipTree: shipTreeFaction !== undefined,
  });
  // A deep link to a tab this race has nothing for would select a tab that is
  // not rendered, leaving the page blank; show the overview instead.
  const selectedTab = visibleTabs.has(activeTab)
    ? activeTab
    : DEFAULT_RACE_PAGE_TAB;
  const fetched = new Set(TABLES_FOR_TAB[selectedTab]);

  const tables = {
    items: useRaceTable(race, "items", fetched),
    corporations: useRaceTable(race, "corporations", fetched),
    stations: useRaceTable(race, "stations", fetched),
    alphaSkills: useRaceTable(race, "alphaSkills", fetched),
    racialSkills: useRaceTable(race, "racialSkills", fetched),
  };
  // Only the open tab's tables: a failure elsewhere is that tab's to show.
  const failedTable = [...fetched].some((table) => tables[table].isError);

  const tab = (value: string, icon: ReactNode, label: string, count?: number) =>
    visibleTabs.has(value) && (
      <Tabs.Tab
        value={value}
        leftSection={icon}
        rightSection={
          count === undefined ? undefined : (
            <Badge size="xs" variant="light" color="gray">
              {formatCount(count)}
            </Badge>
          )
        }
      >
        {label}
      </Tabs.Tab>
    );

  return (
    <Container size="lg" py="md">
      <Stack gap="lg">
        <HeroCard artwork={<HeroImage race={race} factionId={factionId} />}>
          <Text size="sm" c="dimmed">
            Race
          </Text>
          <Group gap="sm" align="center">
            <Title order={2}>{race.name}</Title>
            {isPlayable && (
              <Badge color="teal" variant="light">
                Playable
              </Badge>
            )}
          </Group>
          {hasDescription && (
            <Text fs="italic" c="dimmed">
              {firstSentence(description)}
            </Text>
          )}

          {(race.faction !== null || race.starterShip !== null) && (
            <Group gap="xl">
              {race.faction && (
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" c="dimmed">
                    Faction
                  </Text>
                  <FactionAvatar factionId={race.faction.id} size="sm" />
                  <FactionAnchor factionId={race.faction.id}>
                    {race.faction.name}
                  </FactionAnchor>
                </Group>
              )}
              {race.starterShip && (
                <Group gap="xs" wrap="nowrap">
                  <Text size="sm" c="dimmed">
                    Starter ship
                  </Text>
                  <TypeLink
                    typeId={race.starterShip.id}
                    name={race.starterShip.name}
                  />
                </Group>
              )}
            </Group>
          )}

          <Group gap="xl">
            {race.bloodlines.length > 0 && (
              <HeroStat
                label="Bloodlines"
                value={formatCount(race.bloodlines.length)}
              />
            )}
            {publishedShips > 0 && (
              <HeroStat label="Ships" value={formatCount(publishedShips)} />
            )}
            <HeroStat label="Items" value={formatCount(counts.items)} />
            {counts.stations > 0 && (
              <HeroStat label="Stations" value={formatCount(counts.stations)} />
            )}
            {race.agents.total > 0 && (
              <HeroStat label="Agents" value={formatCount(race.agents.total)} />
            )}
          </Group>
        </HeroCard>

        {failedTable && (
          <Alert color="red" variant="light">
            This tab&apos;s data could not be loaded. Try reloading the page.
          </Alert>
        )}

        <Tabs
          value={selectedTab}
          onChange={(value) => {
            if (!isRacePageTab(value)) return;
            void setActiveTab(value);
            // The clone type belongs to the Ship Tree tab: don't carry it into
            // the links of the others.
            if (value !== "ship-tree") void setShipTreeOmega(null);
          }}
          variant="outline"
          keepMounted={false}
        >
          <Tabs.List>
            {tab("overview", <IconInfoCircle size={16} />, "Overview")}
            {tab("description", <IconFileText size={16} />, "Description")}
            {tab(
              "bloodlines",
              <IconDna size={16} />,
              "Bloodlines",
              race.bloodlines.length,
            )}
            {tab(
              "schools",
              <IconSchool size={16} />,
              "Schools",
              race.schools.length,
            )}
            {tab("skills", <IconListCheck size={16} />, "Skills")}
            {tab("ships", <IconRocket size={16} />, "Ships", publishedShips)}
            {tab("ship-tree", <IconHierarchy3 size={16} />, "Ship Tree")}
            {tab("items", <IconPackage size={16} />, "Items", counts.items)}
            {tab(
              "corporations",
              <IconBuildingSkyscraper size={16} />,
              "Corporations",
              counts.corporations,
            )}
            {tab(
              "stations",
              <IconBuildingStore size={16} />,
              "Stations",
              counts.stations > 0 ? counts.stations : undefined,
            )}
            {tab("history", <IconHistory size={16} />, "History")}
          </Tabs.List>

          {/* Overview */}
          <Tabs.Panel value="overview" pt="lg">
            <OverviewPanel
              race={race}
              publishedShips={publishedShips}
              publishedItems={publishedItems}
            />
          </Tabs.Panel>

          {/* Description */}
          {visibleTabs.has("description") && (
            <Tabs.Panel value="description" pt="lg">
              <Paper withBorder radius="md" p="md">
                <MailMessageViewer
                  content={sanitizeFormattedEveString(description)}
                />
              </Paper>
            </Tabs.Panel>
          )}

          {/* Bloodlines */}
          {visibleTabs.has("bloodlines") && (
            <Tabs.Panel value="bloodlines" pt="lg">
              <BloodlinesPanel bloodlines={race.bloodlines} />
            </Tabs.Panel>
          )}

          {/* Schools */}
          {visibleTabs.has("schools") && (
            <Tabs.Panel value="schools" pt="lg">
              <SchoolsPanel schools={race.schools} />
            </Tabs.Panel>
          )}

          {/* Skills */}
          {visibleTabs.has("skills") && (
            <Tabs.Panel value="skills" pt="lg">
              <SkillsPanel
                startingSkills={race.startingSkills}
                cloneGrade={race.cloneGrade}
                counts={counts}
                alphaSkills={tables.alphaSkills}
                racialSkills={tables.racialSkills}
              />
            </Tabs.Panel>
          )}

          {/* Ships */}
          {visibleTabs.has("ships") && (
            <Tabs.Panel value="ships" pt="lg">
              <ShipsPanel
                shipClasses={race.shipClasses}
                starterShipId={race.starterShip?.id ?? null}
                corvetteIds={corvetteIds}
              />
            </Tabs.Panel>
          )}

          {/* Ship tree: the race's own faction's, drawn in the browser */}
          {shipTreeFaction && (
            <Tabs.Panel value="ship-tree" pt="lg">
              <LazyShipTreeTab faction={shipTreeFaction.id} />
            </Tabs.Panel>
          )}

          {/* Items */}
          {visibleTabs.has("items") && (
            <Tabs.Panel value="items" pt="lg">
              <ItemsPanel
                items={tables.items.data}
                total={counts.items}
                // Pending, not merely "no data yet": a failed fetch must stop loading.
                isLoading={tables.items.isPending}
              />
            </Tabs.Panel>
          )}

          {/* Corporations */}
          {visibleTabs.has("corporations") && (
            <Tabs.Panel value="corporations" pt="lg">
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  NPC corporations of this race (<b>Race</b>), and those that
                  accept pilots of this race as members (<b>Accepts</b>).
                  Corporations with a loyalty point store link to their offers.
                </Text>
                <DataTable
                  data={tables.corporations.data ?? NO_ROWS}
                  isLoading={tables.corporations.isPending}
                  columns={corporationColumns}
                  rowId={(row) => row.corporationId}
                  initialSort={{ columnId: "name", direction: "asc" }}
                  withGlobalFilter
                  withColumnVisibility
                  withPagination
                  defaultPageSize={50}
                  verticalSpacing="xs"
                  highlightOnHover
                  striped
                />
              </Stack>
            </Tabs.Panel>
          )}

          {/* Stations */}
          {visibleTabs.has("stations") && (
            <Tabs.Panel value="stations" pt="lg">
              <StationsPanel
                stationTypes={race.stationTypes}
                stations={tables.stations.data}
                hasStations={counts.stations > 0}
                isLoading={tables.stations.isPending}
              />
            </Tabs.Panel>
          )}

          {/* History — per-build change timeline (loaded on demand) */}
          <Tabs.Panel value="history" pt="lg">
            <EmbeddedEntityHistory history={history} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
