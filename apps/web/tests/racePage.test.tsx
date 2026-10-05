import "@testing-library/jest-dom/jest-globals";

import type { OnUrlUpdateFunction } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { Suspense } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type {
  RaceCorporationRow,
  RaceItemRow,
  RacePageData,
  RaceStationRow,
} from "~/app/race/[raceId]/types";

// ---------------------------------------------------------------------------
// /race/[raceId] reads one cached half on the server (data.ts) and renders a
// tabbed client page. The page carries everything but three long lists (the
// race's items, NPC corporations and stations), which a tab fetches from
// /api/race/[raceId]/[table] when it opens.
// ---------------------------------------------------------------------------

type Query = (args?: unknown) => Promise<unknown>;

const prismaMock = {
  race: { findUnique: jest.fn<Query>() },
  type: { findMany: jest.fn<Query>() },
  metaGroup: { findMany: jest.fn<Query>() },
  bloodline: { findMany: jest.fn<Query>() },
  factionMemberRace: { findMany: jest.fn<Query>() },
  school: { findMany: jest.fn<Query>() },
  schoolMap: { findMany: jest.fn<Query>() },
  raceSkill: { findMany: jest.fn<Query>() },
  cloneGrade: { findUnique: jest.fn<Query>() },
  stationOperationStationType: { findMany: jest.fn<Query>() },
  agent: { groupBy: jest.fn<Query>() },
  corporation: { findMany: jest.fn<Query>(), count: jest.fn<Query>() },
  station: { findMany: jest.fn<Query>(), count: jest.fn<Query>() },
  typeAttribute: { findMany: jest.fn<Query>() },
  character: { findMany: jest.fn<Query>() },
  solarSystem: { findMany: jest.fn<Query>() },
  npcCorporationDivision: { findMany: jest.fn<Query>() },
  agentType: { findMany: jest.fn<Query>() },
};

jest.mock("~/lib/db", () => ({ prisma: prismaMock }));

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({}),
  usePathname: () => "/",
}));

// Every @jitaspace/ui export renders its children (or nothing).
jest.mock(
  "@jitaspace/ui",
  () =>
    new Proxy(
      {},
      {
        get:
          () =>
          ({ children }: { children?: ReactNode }) =>
            children ?? null,
      },
    ),
);

jest.mock("@jitaspace/tiptap-eve", () => ({
  sanitizeFormattedEveString: (s: string) => s,
}));

jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content?: string }) => (
    <div data-testid="mail-viewer">{content}</div>
  ),
}));

// The real tab loads the ship tree library and its stylesheet.
jest.mock("~/components/ShipTree/ShipTreeTab", () => ({
  __esModule: true,
  default: ({ faction }: { faction: number }) => (
    <div data-testid="race-ship-tree">{`ship tree of ${faction}`}</div>
  ),
}));

jest.mock("~/app/history/EntityHistory", () => ({
  EntityHistory: ({ entityId }: { entityId: number }) => (
    <div data-testid="entity-history">{`history of ${entityId}`}</div>
  ),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href?: string | object;
    children?: ReactNode;
  }) => <a href={typeof href === "string" ? href : ""}>{children}</a>,
}));

const AMARR = 4;
const AMARR_EMPIRE = 500003;

const attributes = {
  intelligence: 7,
  perception: 4,
  charisma: 3,
  willpower: 10,
  memory: 6,
};

function raceData(overrides: Partial<RacePageData> = {}): RacePageData {
  return {
    raceId: AMARR,
    name: "Amarr",
    description:
      "The Amarr Empire is the largest and oldest of the four empires. Ruled by a mighty Empress.",
    iconId: 1442,
    faction: { id: AMARR_EMPIRE, name: "Amarr Empire" },
    starterShip: { id: 596, name: "Impairor" },
    factions: [
      {
        factionId: AMARR_EMPIRE,
        name: "Amarr Empire",
        isHomeFaction: true,
        isMemberRace: true,
      },
      {
        factionId: 500012,
        name: "Blood Raider Covenant",
        isHomeFaction: false,
        isMemberRace: true,
      },
    ],
    bloodlines: [
      {
        bloodlineId: 5,
        name: "Amarr",
        description: "True Amarrians are proud and supercilious.",
        iconId: 1628,
        corporation: { id: 1000066, name: "Viziam" },
        shipType: { id: 596, name: "Impairor" },
        attributes,
        ancestries: [
          {
            ancestryId: 1,
            name: "Liberal Holders",
            shortDescription: "Progressive members of the upper class.",
            description: "Holders are the landholding class.",
            iconId: 1641,
            bonuses: {
              intelligence: 0,
              perception: 0,
              charisma: 3,
              willpower: 1,
              memory: 0,
            },
          },
        ],
      },
    ],
    schools: [
      {
        schoolId: 11,
        name: "Imperial Academy",
        title: "Military Institute",
        description: "Rooted in tradition.",
        characterDescription: "Soldiers who have graduated.",
        iconId: 1447,
        corporation: { id: 1000166, name: "Imperial Academy" },
        isStarterSpaceSchool: false,
        homeSystem: {
          solarSystemId: 30003489,
          name: "Kehour",
          securityStatus: 0.6,
          regionId: 10000043,
          regionName: "Domain",
        },
        startingStations: [
          {
            stationId: 60015154,
            stationName: "Kehour I - Imperial Academy",
            solarSystemId: 30003489,
            name: "Kehour",
            securityStatus: 0.6,
            regionId: 10000043,
            regionName: "Domain",
          },
        ],
        careerAgents: [{ id: 3018921, name: "Yrsa Utrais" }],
      },
    ],
    startingSkills: [
      {
        typeId: 3331,
        name: "Amarr Frigate",
        groupId: 257,
        groupName: "Spaceship Command",
        published: true,
        rank: 2,
        primaryAttribute: "perception",
        secondaryAttribute: "willpower",
        level: 3,
        skillPoints: 16000,
      },
    ],
    cloneGrade: {
      cloneGradeId: AMARR,
      name: "Alpha Amarr",
      skills: [
        {
          typeId: 3303,
          name: "Small Energy Turret",
          groupId: 255,
          groupName: "Gunnery",
          published: true,
          rank: 1,
          primaryAttribute: "perception",
          secondaryAttribute: "willpower",
          maxLevel: 4,
        },
      ],
    },
    racialSkills: [
      {
        typeId: 3343,
        name: "Amarr Battleship",
        groupId: 257,
        groupName: "Spaceship Command",
        published: true,
        rank: 8,
        primaryAttribute: "perception",
        secondaryAttribute: "willpower",
      },
    ],
    shipClasses: [
      {
        groupId: 237,
        name: "Corvette",
        ships: [{ typeId: 596, name: "Impairor", metaGroupName: "Tech I" }],
      },
      {
        groupId: 27,
        name: "Battleship",
        ships: [{ typeId: 642, name: "Apocalypse", metaGroupName: "Tech I" }],
      },
    ],
    itemCategories: [
      { categoryId: 91, name: "SKINs", total: 3000, published: 1619 },
      { categoryId: 6, name: "Ship", total: 120, published: 87 },
    ],
    stationTypes: [
      {
        typeId: 1930,
        name: "Amarr Standard Station",
        operations: ["Academy", "Plantation"],
      },
    ],
    agents: {
      total: 2746,
      locators: 300,
      byLevel: [
        { level: 1, count: 900 },
        { level: 4, count: 400 },
      ],
      byDivision: [{ id: 24, name: "Security", count: 1200 }],
      byType: [
        { id: 2, name: "BasicAgent", count: 2600 },
        { id: 4, name: "GenericStorylineMissionAgent", count: 146 },
      ],
    },
    counts: { items: 7125, corporations: 73, stations: 1300 },
    ...overrides,
  };
}

const itemRows: RaceItemRow[] = [
  {
    typeId: 642,
    name: "Apocalypse",
    published: true,
    groupId: 27,
    groupName: "Battleship",
    categoryId: 6,
    categoryName: "Ship",
    metaGroupName: "Tech I",
    techLevel: 1,
  },
  {
    typeId: 99999,
    name: "Amarr NPC Placeholder",
    published: false,
    groupId: 27,
    groupName: "Battleship",
    categoryId: 6,
    categoryName: "Ship",
    metaGroupName: null,
    techLevel: null,
  },
];

const corporationRows: RaceCorporationRow[] = [
  {
    corporationId: 1000066,
    name: "Viziam",
    ticker: "VIZ",
    memberCount: 12,
    factionId: AMARR_EMPIRE,
    factionName: "Amarr Empire",
    size: "L",
    extent: "R",
    stations: 40,
    lpOffers: 200,
    isRaceCorporation: true,
    acceptsRace: true,
  },
];

const stationRows: RaceStationRow[] = [
  {
    stationId: 60008494,
    stationName: "Amarr VIII (Oris) - Emperor Family Academy",
    typeId: 1932,
    typeName: "Amarr Trade Post",
    ownerId: 1000086,
    ownerName: "Emperor Family",
    solarSystemId: 30002187,
    name: "Amarr",
    securityStatus: 1,
    regionId: 10000043,
    regionName: "Domain",
  },
];

const mockFetch = jest.fn<(url: string) => Promise<unknown>>();

/** What each table route answers, keyed by the table's name. */
function tableResponses(
  overrides: Record<string, Promise<unknown>> = {},
): (url: string) => Promise<unknown> {
  const rows: Record<string, unknown> = {
    items: itemRows,
    corporations: corporationRows,
    stations: stationRows,
  };
  return (url) => {
    const table = url.split("/").at(-1) ?? "";
    return (
      overrides[table] ??
      Promise.resolve({ ok: true, json: () => Promise.resolve(rows[table]) })
    );
  };
}

function renderClient(
  race: RacePageData,
  searchParams = "",
  fetchImplementation = tableResponses(),
  onUrlUpdate?: OnUrlUpdateFunction,
) {
  mockFetch.mockImplementation(fetchImplementation);
  globalThis.fetch = mockFetch as unknown as typeof globalThis.fetch;
  const Page = require("~/app/race/[raceId]/page.client").default;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Page {...race} />
      </MantineProvider>
    </QueryClientProvider>,
    { wrapper: withNuqsTestingAdapter({ searchParams, onUrlUpdate }) },
  );
}

const raceRow = {
  raceId: AMARR,
  name: "Amarr",
  description: "The Amarr Empire.",
  iconId: 1442,
  isDeleted: false,
  factionId: AMARR_EMPIRE,
  faction: { name: "Amarr Empire" },
  shipTypeId: 596,
  shipType: { name: "Impairor" },
};

const typeRow = (
  typeId: number,
  name: string,
  group: { id: number; name: string; categoryId: number; category: string },
  extra: Partial<{ published: boolean; mass: number | null }> = {},
) => ({
  typeId,
  name,
  published: extra.published ?? true,
  groupId: group.id,
  metaGroupId: 1,
  techLevel: 1,
  mass: extra.mass ?? null,
  group: {
    name: group.name,
    categoryId: group.categoryId,
    category: { name: group.category },
  },
});

const FRIGATE = { id: 25, name: "Frigate", categoryId: 6, category: "Ship" };
const BATTLESHIP = {
  id: 27,
  name: "Battleship",
  categoryId: 6,
  category: "Ship",
};
const SPACESHIP_COMMAND = {
  id: 257,
  name: "Spaceship Command",
  categoryId: 16,
  category: "Skill",
};

/** Every read resolves empty, except the race itself. */
function mockEmptyReads() {
  prismaMock.race.findUnique.mockResolvedValue(raceRow);
  for (const model of Object.values(prismaMock)) {
    if ("findMany" in model) model.findMany.mockResolvedValue([]);
    if ("count" in model) model.count.mockResolvedValue(0);
    if ("groupBy" in model) model.groupBy.mockResolvedValue([]);
  }
  prismaMock.cloneGrade.findUnique.mockResolvedValue(null);
}

function resetPrisma() {
  for (const model of Object.values(prismaMock)) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
}

describe("race page data", () => {
  beforeEach(resetPrisma);

  it("returns null for an unknown race, without reading anything else", async () => {
    prismaMock.race.findUnique.mockResolvedValue(null);
    const { readRaceData } = require("~/app/race/[raceId]/data");

    expect(await readRaceData(999)).toBeNull();
    expect(prismaMock.type.findMany).not.toHaveBeenCalled();
  });

  it("returns null for a race the ingest soft-deleted", async () => {
    prismaMock.race.findUnique.mockResolvedValue({
      ...raceRow,
      isDeleted: true,
    });
    const { readRaceData } = require("~/app/race/[raceId]/data");

    expect(await readRaceData(AMARR)).toBeNull();
  });

  it("orders ship classes by mass and counts items by category", async () => {
    mockEmptyReads();
    // The race's own types first (by raceId), then the skill names (by id).
    prismaMock.type.findMany.mockImplementation((args) =>
      Promise.resolve(
        (args as { where: { raceId?: number } }).where.raceId === undefined
          ? [
              {
                typeId: 3343,
                name: "Amarr Battleship",
                published: true,
                groupId: 257,
                group: { name: "Spaceship Command" },
              },
            ]
          : [
              typeRow(642, "Apocalypse", BATTLESHIP, { mass: 97_100_000 }),
              typeRow(643, "Armageddon", BATTLESHIP, { mass: 105_200_000 }),
              typeRow(597, "Punisher", FRIGATE, { mass: 1_047_000 }),
              typeRow(1, "Unreleased Hull", FRIGATE, { published: false }),
              typeRow(3343, "Amarr Battleship", SPACESHIP_COMMAND),
            ],
      ),
    );
    prismaMock.metaGroup.findMany.mockResolvedValue([
      { metaGroupId: 1, name: "Tech I" },
    ]);
    prismaMock.typeAttribute.findMany.mockResolvedValue([
      { typeId: 3343, attributeId: 275, value: 8 },
      { typeId: 3343, attributeId: 180, value: 167 },
      { typeId: 3343, attributeId: 181, value: 168 },
    ]);
    const { readRaceData } = require("~/app/race/[raceId]/data");

    const data = (await readRaceData(AMARR)) as RacePageData;

    // Frigates before battleships; the unpublished hull is left out.
    expect(data.shipClasses).toEqual([
      {
        groupId: 25,
        name: "Frigate",
        ships: [{ typeId: 597, name: "Punisher", metaGroupName: "Tech I" }],
      },
      {
        groupId: 27,
        name: "Battleship",
        ships: [
          { typeId: 642, name: "Apocalypse", metaGroupName: "Tech I" },
          { typeId: 643, name: "Armageddon", metaGroupName: "Tech I" },
        ],
      },
    ]);
    expect(data.itemCategories).toEqual([
      { categoryId: 6, name: "Ship", total: 4, published: 3 },
      { categoryId: 16, name: "Skill", total: 1, published: 1 },
    ]);
    expect(data.counts.items).toBe(5);
    expect(data.racialSkills).toEqual([
      {
        typeId: 3343,
        name: "Amarr Battleship",
        groupId: 257,
        groupName: "Spaceship Command",
        published: true,
        rank: 8,
        primaryAttribute: "perception",
        secondaryAttribute: "willpower",
      },
    ]);
  });

  it("prices starting skills in skill points and keys the clone grade by race", async () => {
    mockEmptyReads();
    prismaMock.raceSkill.findMany.mockResolvedValue([
      { skillTypeId: 3331, level: 3 },
      { skillTypeId: 3300, level: 0 },
    ]);
    prismaMock.cloneGrade.findUnique.mockResolvedValue({
      cloneGradeId: AMARR,
      name: "Alpha Amarr",
      isDeleted: false,
      skills: [{ skillTypeId: 3300, level: 5 }],
    });
    prismaMock.type.findMany.mockImplementation((args) =>
      Promise.resolve(
        (args as { where: { raceId?: number } }).where.raceId === undefined
          ? [
              {
                typeId: 3331,
                name: "Amarr Frigate",
                published: true,
                groupId: 257,
                group: { name: "Spaceship Command" },
              },
              {
                typeId: 3300,
                name: "Gunnery",
                published: true,
                groupId: 255,
                group: { name: "Gunnery" },
              },
            ]
          : [],
      ),
    );
    prismaMock.typeAttribute.findMany.mockResolvedValue([
      { typeId: 3331, attributeId: 275, value: 2 },
      { typeId: 3300, attributeId: 275, value: 1 },
    ]);
    const { readRaceData } = require("~/app/race/[raceId]/data");

    const data = (await readRaceData(AMARR)) as RacePageData;

    expect(prismaMock.cloneGrade.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cloneGradeId: AMARR } }),
    );
    // Level 3 at rank 2 is 2 × 8,000; level 0 is injected but untrained.
    expect(
      data.startingSkills.map((skill) => [skill.name, skill.skillPoints]),
    ).toEqual([
      ["Gunnery", 0],
      ["Amarr Frigate", 16000],
    ]);
    expect(data.cloneGrade).toMatchObject({
      name: "Alpha Amarr",
      skills: [{ name: "Gunnery", maxLevel: 5, rank: 1 }],
    });
  });

  it("lists the home faction first, even when no faction counts the race", async () => {
    mockEmptyReads();
    prismaMock.factionMemberRace.findMany.mockResolvedValue([
      { factionId: 500012, faction: { name: "Blood Raider Covenant" } },
      { factionId: 500008, faction: { name: "Khanid Kingdom" } },
    ]);
    const { readRaceData } = require("~/app/race/[raceId]/data");

    const data = (await readRaceData(AMARR)) as RacePageData;

    expect(data.faction).toEqual({ id: AMARR_EMPIRE, name: "Amarr Empire" });
    expect(data.factions).toEqual([
      {
        factionId: AMARR_EMPIRE,
        name: "Amarr Empire",
        isHomeFaction: true,
        isMemberRace: false,
      },
      {
        factionId: 500012,
        name: "Blood Raider Covenant",
        isHomeFaction: false,
        isMemberRace: true,
      },
      {
        factionId: 500008,
        name: "Khanid Kingdom",
        isHomeFaction: false,
        isMemberRace: true,
      },
    ]);
  });

  it("resolves schools' stations, agents and system, originals first", async () => {
    mockEmptyReads();
    const school = (schoolId: number, isStarterSpaceSchool: boolean) => ({
      schoolId,
      name: `School ${schoolId}`,
      title: null,
      description: null,
      characterDescription: null,
      iconId: null,
      corporationId: 1000166,
      isStarterSpaceSchool,
      careerAgents: [{ agentId: 3018921 }],
      startingStations: [{ stationId: 60015154 }],
    });
    prismaMock.school.findMany.mockResolvedValue([
      school(31, true),
      school(11, false),
    ]);
    prismaMock.schoolMap.findMany.mockResolvedValue([
      { schoolId: 11, solarSystemId: 30003489 },
      { schoolId: 17, solarSystemId: 30000141 },
    ]);
    const kehour = {
      solarSystemId: 30003489,
      name: "Kehour",
      securityStatus: { toString: () => "0.6" },
      constellation: { regionId: 10000043, region: { name: "Domain" } },
    };
    prismaMock.solarSystem.findMany.mockResolvedValue([kehour]);
    prismaMock.station.findMany.mockResolvedValue([
      { stationId: 60015154, name: "Kehour I", solarSystem: kehour },
    ]);
    prismaMock.character.findMany.mockResolvedValue([
      { characterId: 3018921, name: "Yrsa Utrais" },
    ]);
    prismaMock.corporation.findMany.mockResolvedValue([
      { corporationId: 1000166, name: "Imperial Academy" },
    ]);
    const { readRaceData } = require("~/app/race/[raceId]/data");

    const data = (await readRaceData(AMARR)) as RacePageData;

    // Only this race's schools' systems are looked up.
    expect(prismaMock.solarSystem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { solarSystemId: { in: [30003489] } } }),
    );
    expect(data.schools.map((s) => s.schoolId)).toEqual([11, 31]);
    expect(data.schools[0]).toMatchObject({
      corporation: { id: 1000166, name: "Imperial Academy" },
      homeSystem: { name: "Kehour", securityStatus: 0.6, regionName: "Domain" },
      startingStations: [
        { stationId: 60015154, stationName: "Kehour I", name: "Kehour" },
      ],
      careerAgents: [{ id: 3018921, name: "Yrsa Utrais" }],
    });
    expect(data.schools[1]?.homeSystem).toBeNull();
  });

  it("summarizes agents by level, division and type", async () => {
    mockEmptyReads();
    prismaMock.agent.groupBy.mockResolvedValue([
      {
        level: 4,
        agentDivisionId: 24,
        agentTypeId: 2,
        isLocator: true,
        _count: { _all: 10 },
      },
      {
        level: 1,
        agentDivisionId: 22,
        agentTypeId: 2,
        isLocator: false,
        _count: { _all: 30 },
      },
      {
        level: 4,
        agentDivisionId: 22,
        agentTypeId: 4,
        isLocator: false,
        _count: { _all: 5 },
      },
    ]);
    prismaMock.npcCorporationDivision.findMany.mockResolvedValue([
      { npcCorporationDivisionId: 22, name: "Distribution", displayName: null },
      {
        npcCorporationDivisionId: 24,
        name: "security",
        displayName: "Security",
      },
    ]);
    prismaMock.agentType.findMany.mockResolvedValue([
      { agentTypeId: 2, name: "BasicAgent" },
    ]);
    const { readRaceData } = require("~/app/race/[raceId]/data");

    const { agents } = (await readRaceData(AMARR)) as RacePageData;

    expect(prismaMock.agent.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isDeleted: false, Character: { raceId: AMARR } },
      }),
    );
    expect(agents).toEqual({
      total: 45,
      locators: 10,
      byLevel: [
        { level: 1, count: 30 },
        { level: 4, count: 15 },
      ],
      byDivision: [
        { id: 22, name: "Distribution", count: 35 },
        { id: 24, name: "Security", count: 10 },
      ],
      byType: [
        { id: 2, name: "BasicAgent", count: 40 },
        { id: 4, name: "Agent type 4", count: 5 },
      ],
    });
  });

  it("counts the tables with the same filters their routes read", async () => {
    mockEmptyReads();
    prismaMock.corporation.count.mockResolvedValue(73);
    prismaMock.station.count.mockResolvedValue(1300);
    const data = (await require("~/app/race/[raceId]/data").readRaceData(
      AMARR,
    )) as RacePageData;
    prismaMock.corporation.findMany.mockResolvedValue([]);
    prismaMock.station.findMany.mockResolvedValue([]);
    const {
      readRaceCorporations,
      readRaceStations,
    } = require("~/app/race/[raceId]/data");
    await readRaceCorporations(AMARR);
    await readRaceStations(AMARR);

    expect(data.counts).toMatchObject({ corporations: 73, stations: 1300 });
    const countWhere = (mock: jest.Mock<Query>) =>
      (mock.mock.calls[0]?.[0] as { where: unknown }).where;
    const readWhere = (mock: jest.Mock<Query>) =>
      (mock.mock.calls.at(-1)?.[0] as { where: unknown }).where;
    expect(countWhere(prismaMock.corporation.count)).toEqual(
      readWhere(prismaMock.corporation.findMany),
    );
    expect(countWhere(prismaMock.station.count)).toEqual(
      readWhere(prismaMock.station.findMany),
    );
    // NPC corporations only: the player ones are almost all of the table.
    expect(countWhere(prismaMock.corporation.count)).toMatchObject({
      corporationId: { gte: 1_000_000, lt: 2_000_000 },
    });
  });

  it("marks how each corporation relates to the race", async () => {
    prismaMock.corporation.findMany.mockResolvedValue([
      {
        corporationId: 1000066,
        name: "Viziam",
        ticker: "VIZ",
        memberCount: 12,
        raceId: AMARR,
        factionId: AMARR_EMPIRE,
        faction: { name: "Amarr Empire" },
        size: "L",
        extent: "R",
        allowedRaces: [],
        _count: { ownedStations: 40, LoyaltyStoreOffer: 200 },
      },
      {
        corporationId: 1000035,
        name: "Caldari Navy",
        ticker: "CN",
        memberCount: 0,
        raceId: 1,
        factionId: 500001,
        faction: { name: "Caldari State" },
        size: null,
        extent: null,
        allowedRaces: [{ raceId: AMARR }],
        _count: { ownedStations: 0, LoyaltyStoreOffer: 0 },
      },
    ]);
    const { readRaceCorporations } = require("~/app/race/[raceId]/data");

    const rows = (await readRaceCorporations(AMARR)) as RaceCorporationRow[];

    expect(
      rows.map((row) => [row.name, row.isRaceCorporation, row.acceptsRace]),
    ).toEqual([
      ["Caldari Navy", false, true],
      ["Viziam", true, false],
    ]);
    expect(rows[1]).toMatchObject({ stations: 40, lpOffers: 200 });
  });
});

describe("race page (server)", () => {
  function renderServerContent(raceId: string) {
    const Page = require("~/app/race/[raceId]/page").default;
    const tree = Page({ params: Promise.resolve({ raceId }) });
    expect(tree.type).toBe(Suspense);
    const child = tree.props.children;
    return child.type(child.props) as Promise<ReactNode>;
  }

  beforeEach(resetPrisma);

  it.each(["0", "-1", "01", "1.0", "bad", ""])(
    "404s %p without querying, rather than serve a second URL",
    async (raceId) => {
      await expect(renderServerContent(raceId)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
      expect(prismaMock.race.findUnique).not.toHaveBeenCalled();
    },
  );

  it("404s an unknown race", async () => {
    prismaMock.race.findUnique.mockResolvedValue(null);
    await expect(renderServerContent("999")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("lets a failed read throw instead of rendering a 404", async () => {
    prismaMock.race.findUnique.mockRejectedValue(new Error("down"));
    await expect(renderServerContent(String(AMARR))).rejects.toThrow("down");
  });

  it("hands the client the race, under nuqs's React adapter", async () => {
    mockEmptyReads();

    const tree = (await renderServerContent(String(AMARR))) as {
      props: { children: { props: Record<string, unknown> } };
    };
    const props = tree.props.children.props;

    expect(props).toMatchObject({ raceId: AMARR, name: "Amarr" });
    expect(props.counts).toEqual({ items: 0, corporations: 0, stations: 0 });
  });

  it("lists one placeholder param, which 404s without a query", () => {
    const { generateStaticParams } = require("~/app/race/[raceId]/page");
    expect(generateStaticParams()).toEqual([{ raceId: "0" }]);
  });
});

describe("race page (client)", () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("renders the hero and one tab per section with data", () => {
    renderClient(raceData());

    expect(screen.getByRole("heading", { name: "Amarr" })).toBeInTheDocument();
    expect(screen.getByText("Playable")).toBeInTheDocument();
    // The description's first sentence, as a tagline.
    expect(
      screen.getByText(
        "The Amarr Empire is the largest and oldest of the four empires.",
      ),
    ).toBeInTheDocument();
    for (const name of [
      /Overview/,
      /Description/,
      /Bloodlines/,
      /Schools/,
      /Skills/,
      /Ships/,
      /Ship Tree/,
      /Items/,
      /Corporations/,
      /Stations/,
      /History/,
    ]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
    // Overview content: identity, factions, agents and categories.
    expect(screen.getByText("Alpha clone grade")).toBeInTheDocument();
    expect(screen.getByText("Home faction")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
    // Agent types by their readable name, not CCP's internal one.
    expect(screen.getByText("Basic")).toBeInTheDocument();
    expect(screen.getByText("Generic Storyline Mission")).toBeInTheDocument();
    expect(screen.getByText("1,619 published")).toBeInTheDocument();
  });

  it("hides the tabs a race has nothing for", () => {
    renderClient(
      raceData({
        description: "Rogue Drones",
        name: "Rogue Drones",
        faction: null,
        starterShip: null,
        factions: [],
        bloodlines: [],
        schools: [],
        startingSkills: [],
        cloneGrade: null,
        racialSkills: [],
        shipClasses: [],
        stationTypes: [],
        counts: { items: 88, corporations: 0, stations: 0 },
      }),
    );

    for (const name of [
      /Description/,
      /Bloodlines/,
      /Schools/,
      /Skills/,
      /Ships/,
      /Ship Tree/,
      /Corporations/,
      /Stations/,
    ]) {
      expect(screen.queryByRole("tab", { name })).not.toBeInTheDocument();
    }
    expect(screen.getByRole("tab", { name: /Items/ })).toBeInTheDocument();
    // A description that is only the name is no tagline either.
    expect(screen.queryByText("Playable")).not.toBeInTheDocument();
    expect(screen.getAllByText("Rogue Drones")).toHaveLength(1);
    // No wall of zeros: the empty counts are left out, items stay.
    expect(screen.queryByText("Schools")).not.toBeInTheDocument();
    expect(screen.queryByText("Ships")).not.toBeInTheDocument();
    expect(screen.getAllByText("Items").length).toBeGreaterThan(1);
  });

  it("draws its faction's ship tree in a tab, loaded on demand", async () => {
    renderClient(raceData());
    expect(screen.queryByTestId("race-ship-tree")).not.toBeInTheDocument();
    cleanup();

    renderClient(raceData(), "?tab=ship-tree");

    // Until the tab's module arrives, a placeholder in the tab's own shape.
    expect(screen.getByTestId("ship-tree-placeholder")).toBeInTheDocument();
    expect(await screen.findByTestId("race-ship-tree")).toHaveTextContent(
      `ship tree of ${AMARR_EMPIRE}`,
    );
    // It needs none of the table rows, and the hero no longer links away.
    expect(mockFetch).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("link", { name: "Ship tree" }),
    ).not.toBeInTheDocument();
  });

  it("draws the tree of the one faction a race without a home belongs to", async () => {
    renderClient(
      raceData({
        faction: null,
        factions: [
          {
            factionId: 500026,
            name: "Triglavian Collective",
            isHomeFaction: false,
            isMemberRace: true,
          },
        ],
      }),
      "?tab=ship-tree",
    );

    expect(await screen.findByTestId("race-ship-tree")).toHaveTextContent(
      "ship tree of 500026",
    );
  });

  it("has no Ship Tree tab for a race several factions share", () => {
    renderClient(
      raceData({
        faction: null,
        factions: [
          {
            factionId: 500017,
            name: "The Society of Conscious Thought",
            isHomeFaction: false,
            isMemberRace: true,
          },
          {
            factionId: 500005,
            name: "Jove Empire",
            isHomeFaction: false,
            isMemberRace: true,
          },
        ],
      }),
      "?tab=ship-tree",
    );

    expect(
      screen.queryByRole("tab", { name: /Ship Tree/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Overview/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("drops the tree's clone type from the URL when another tab opens", async () => {
    const onUrlUpdate = jest.fn<OnUrlUpdateFunction>();
    renderClient(
      raceData(),
      "?tab=ship-tree&omega=true",
      undefined,
      onUrlUpdate,
    );

    fireEvent.click(screen.getByRole("tab", { name: /Bloodlines/ }));

    await waitFor(() => {
      const url = onUrlUpdate.mock.calls.at(-1)?.[0].searchParams;
      expect(url?.get("tab")).toBe("bloodlines");
      expect(url?.has("omega")).toBe(false);
    });
  });

  it("falls back to the overview for a deep link to a hidden tab", () => {
    renderClient(raceData({ schools: [] }), "?tab=schools");

    expect(screen.getByRole("tab", { name: /Overview/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("does not fetch any table for the overview", () => {
    renderClient(raceData());

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches only the items, and hides unpublished ones until asked", async () => {
    renderClient(raceData(), "?tab=items");

    expect(await screen.findByText("Apocalypse")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(`/api/race/${AMARR}/items`);
    expect(screen.queryByText("Amarr NPC Placeholder")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch"));

    expect(screen.getByText("Amarr NPC Placeholder")).toBeInTheDocument();
  });

  it("lists the corporations with how each relates to the race", async () => {
    renderClient(raceData(), "?tab=corporations");

    expect(await screen.findByText("Viziam")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith(`/api/race/${AMARR}/corporations`);
    expect(screen.getByText("[VIZ]")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "200" })).toHaveAttribute(
      "href",
      "/lp-store/1000066",
    );
  });

  it("ends the loading state when a table fails to load", async () => {
    renderClient(
      raceData(),
      "?tab=stations",
      tableResponses({
        stations: Promise.resolve({ ok: false, status: 500 }),
      }),
    );

    expect(
      await screen.findByText(/This tab's data could not be loaded/),
    ).toBeInTheDocument();
    // An empty table rather than skeleton rows that never resolve.
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("shows the station architecture without fetching when no station is the race's", () => {
    renderClient(
      raceData({ counts: { items: 1, corporations: 1, stations: 0 } }),
      "?tab=stations",
    );

    expect(screen.getByText("Amarr Standard Station")).toBeInTheDocument();
    expect(
      screen.getByText("2 operations: Academy, Plantation"),
    ).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("renders bloodlines with their attributes and ancestries", () => {
    renderClient(raceData(), "?tab=bloodlines");

    expect(screen.getByText("Liberal Holders")).toBeInTheDocument();
    expect(screen.getByText("+3 Charisma")).toBeInTheDocument();
    expect(screen.getByText("+1 Willpower")).toBeInTheDocument();
    expect(screen.getByText("Corvette")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Willpower" }),
    ).toHaveAttribute("aria-valuenow", "100");
  });

  it("renders schools with their stations and career agents", () => {
    renderClient(raceData(), "?tab=schools");

    expect(screen.getByText("Military Institute")).toBeInTheDocument();
    expect(screen.getByText("Kehour I - Imperial Academy")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Yrsa Utrais" })).toHaveAttribute(
      "href",
      "/character/3018921",
    );
  });

  it("totals the starting skill points and lists the Alpha clone's skills", () => {
    renderClient(raceData(), "?tab=skills");

    expect(screen.getAllByText("16,000").length).toBeGreaterThan(0);
    expect(screen.getByText("Small Energy Turret")).toBeInTheDocument();
    expect(screen.getByText("Amarr Battleship")).toBeInTheDocument();
  });

  it("marks the starter ship among the hulls", () => {
    renderClient(raceData(), "?tab=ships");

    // The hero's label, and the badge on the hull.
    expect(screen.getAllByText("Starter ship")).toHaveLength(2);
    expect(screen.getByText("Apocalypse")).toBeInTheDocument();
  });
});
