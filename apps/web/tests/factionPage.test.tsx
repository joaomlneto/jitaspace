import "@testing-library/jest-dom/jest-globals";

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
import { cleanup, render, screen } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type {
  FactionLiveData,
  FactionSdeData,
} from "~/app/faction/[factionId]/types";

// ---------------------------------------------------------------------------
// /faction/[factionId] reads two cached halves on the server (data.ts) — static
// SDE data, and the hourly ESI-job data — and renders a tabbed client page that
// adds live Faction Warfare numbers from ESI.
// ---------------------------------------------------------------------------

type Rows = Record<string, unknown>[];
type Query = (args?: unknown) => Promise<unknown>;

const prismaMock = {
  faction: { findUnique: jest.fn<Query>() },
  race: { findMany: jest.fn<Query>() },
  region: { findMany: jest.fn<Query>() },
  constellation: { findMany: jest.fn<Query>() },
  solarSystem: { findMany: jest.fn<Query>() },
  type: { findMany: jest.fn<Query>() },
  contrabandType: { findMany: jest.fn<Query>() },
  mission: { findMany: jest.fn<Query>() },
  epicArc: { findMany: jest.fn<Query>() },
  dungeon: { findMany: jest.fn<Query>() },
  skillPlan: { findMany: jest.fn<Query>() },
  stationStandingsRestriction: { findMany: jest.fn<Query>() },
  controlTowerResource: { findMany: jest.fn<Query>() },
  metaGroup: { findMany: jest.fn<Query>() },
  corporation: { findMany: jest.fn<Query>(), aggregate: jest.fn<Query>() },
  stationService: { findMany: jest.fn<Query>() },
  alliance: { findMany: jest.fn<Query>() },
  solarSystemSovereignty: { findMany: jest.fn<Query>() },
};

jest.mock("~/lib/db", () => ({ prisma: prismaMock }));

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({}),
  usePathname: () => "/",
}));

const mockFwStats = jest.fn<() => unknown>();
const mockFwWars = jest.fn<() => unknown>();
const mockFwSystems = jest.fn<() => unknown>();
jest.mock("@jitaspace/esi-client", () => ({
  useGetFwStats: () => mockFwStats(),
  useGetFwWars: () => mockFwWars(),
  useGetFwSystems: () => mockFwSystems(),
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

const CALDARI = 500001;

const location = {
  solarSystemId: 30000145,
  name: "New Caldari",
  securityStatus: 1,
  constellationId: 20000020,
  constellationName: "Kimotoro",
  regionId: 10000002,
  regionName: "The Forge",
};

function sdeData(overrides: Partial<FactionSdeData> = {}): FactionSdeData {
  return {
    factionId: CALDARI,
    name: "Caldari State",
    description: "A <b>corporate</b> state.",
    shortDescription: "Strength through enterprise.",
    isUnique: true,
    sizeFactor: 5,
    stationCount: 1503,
    stationSystemCount: 503,
    iconId: 1439,
    corporation: { id: 1000035, name: "Caldari Navy" },
    militiaCorporation: { id: 1000180, name: "State Protectorate" },
    homeSystem: location,
    races: [{ raceId: 1, name: "Caldari", iconId: 1439, isHomeRace: true }],
    regions: [
      {
        regionId: 10000002,
        name: "The Forge",
        isFactionRegion: true,
        constellations: 12,
        systems: 1,
      },
    ],
    constellations: 12,
    systems: [
      {
        ...location,
        stations: 15,
        isHub: true,
        isBorder: false,
        isFringe: false,
        isCorridor: false,
      },
    ],
    items: [
      {
        typeId: 17636,
        name: "Raven Navy Issue",
        published: true,
        groupId: 27,
        groupName: "Battleship",
        categoryId: 6,
        categoryName: "Ship",
        metaGroupName: "Faction",
      },
    ],
    contraband: [
      {
        typeId: 3713,
        name: "Exotic Dancers, Female",
        fineByValue: 0.5,
        standingLoss: 0.1,
        confiscateMinSec: 0.5,
        attackMinSec: 1.1,
      },
    ],
    missions: [
      {
        missionId: 1,
        name: "The Blockade",
        kind: "Encounter",
        rewardTypeId: null,
        rewardTypeName: null,
        rewardQuantity: null,
        hasStandingRewards: true,
      },
    ],
    epicArcs: [{ epicArcId: 3, name: "Penumbra", iconId: null, missions: 50 }],
    dungeons: [],
    skillPlans: [],
    standingRestrictions: [
      {
        stationServiceId: 16,
        serviceName: "Cloning",
        minimumStanding: -2,
      },
    ],
    starbaseCharters: [
      {
        typeId: 24593,
        name: "Caldari State Starbase Charter",
        minSecurityLevel: 0.4,
      },
    ],
    ...overrides,
  };
}

function liveData(overrides: Partial<FactionLiveData> = {}): FactionLiveData {
  return {
    corporations: [
      {
        corporationId: 1000035,
        name: "Caldari Navy",
        ticker: "CN",
        memberCount: 0,
        size: "H",
        extent: "N",
        stations: 41,
        lpOffers: 300,
        isMilitia: false,
      },
    ],
    enlistedCorporations: [],
    enlistedCorporationCount: 0,
    enlistedPilots: 0,
    enlistedAlliances: [],
    sovereignty: [],
    lostSystems: [],
    ...overrides,
  };
}

function renderClient(
  faction: FactionSdeData,
  live: FactionLiveData,
  searchParams = "",
) {
  const Page = require("~/app/faction/[factionId]/page.client").default;
  return render(
    <MantineProvider>
      <Page faction={faction} live={live} />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ searchParams }) },
  );
}

/** Mock every SDE read so readFactionSdeData resolves with the given rows. */
function mockSdeReads(rows: Partial<Record<keyof typeof prismaMock, Rows>>) {
  for (const [model, mock] of Object.entries(prismaMock)) {
    if (!("findMany" in mock)) continue;
    mock.findMany.mockResolvedValue(
      rows[model as keyof typeof prismaMock] ?? [],
    );
  }
}

const factionRow = {
  factionId: CALDARI,
  name: "Caldari State",
  description: "desc",
  shortDescription: null,
  isUnique: true,
  sizeFactor: 5,
  stationCount: 10,
  stationSystemCount: 4,
  iconId: null,
  corporationId: 1000035,
  factionCorporation: { name: "Caldari Navy" },
  militiaCorporationId: null,
  militiaCorporation: null,
  solarSystem: null,
  memberRaces: [{ raceId: 1 }],
};

const systemRow = (id: number, regionId: number, regionName: string) => ({
  solarSystemId: id,
  name: `System ${id}`,
  securityStatus: { toString: () => "0.5" },
  constellationId: 20000000 + id,
  constellation: { name: "C", regionId, region: { name: regionName } },
  isHub: null,
  isBorder: true,
  isFringe: null,
  isCorridor: null,
  _count: { stations: 2 },
});

describe("faction page data", () => {
  beforeEach(() => {
    for (const model of Object.values(prismaMock)) {
      for (const fn of Object.values(model)) fn.mockReset();
    }
  });

  it("returns null for an unknown faction", async () => {
    prismaMock.faction.findUnique.mockResolvedValue(null);
    const { readFactionSdeData } = require("~/app/faction/[factionId]/data");

    expect(await readFactionSdeData(9)).toBeNull();
    expect(prismaMock.region.findMany).not.toHaveBeenCalled();
  });

  it("assembles regions, systems and starbase charters", async () => {
    prismaMock.faction.findUnique.mockResolvedValue(factionRow);
    mockSdeReads({
      region: [{ regionId: 10000002, name: "The Forge" }],
      constellation: [{ constellationId: 1, regionId: 10000002 }],
      solarSystem: [
        systemRow(2, 10000033, "The Citadel"),
        systemRow(1, 10000002, "The Forge"),
        systemRow(3, 10000033, "The Citadel"),
      ],
      controlTowerResource: [
        { resourceTypeId: 24593, minSecurityLevel: 0.7 },
        { resourceTypeId: 24593, minSecurityLevel: 0.4 },
      ],
      type: [],
    });
    // The second `type.findMany` resolves the charter names.
    prismaMock.type.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ typeId: 24593, name: "Charter" }]);
    const { readFactionSdeData } = require("~/app/faction/[factionId]/data");

    const data = (await readFactionSdeData(CALDARI)) as FactionSdeData;

    expect(data.corporation).toEqual({ id: 1000035, name: "Caldari Navy" });
    expect(data.militiaCorporation).toBeNull();
    expect(data.systems.map((s) => s.name)).toEqual([
      "System 1",
      "System 2",
      "System 3",
    ]);
    expect(data.systems[0]).toMatchObject({
      securityStatus: 0.5,
      stations: 2,
      isBorder: true,
      isHub: false,
    });
    // Regions with the most systems first; the faction's own region is flagged.
    expect(data.regions).toEqual([
      {
        regionId: 10000033,
        name: "The Citadel",
        isFactionRegion: false,
        constellations: 0,
        systems: 2,
      },
      {
        regionId: 10000002,
        name: "The Forge",
        isFactionRegion: true,
        constellations: 1,
        systems: 1,
      },
    ]);
    // One charter, at the lowest security any tower needs it.
    expect(data.starbaseCharters).toEqual([
      { typeId: 24593, name: "Charter", minSecurityLevel: 0.4 },
    ]);
  });

  it("resolves territory through region and constellation ownership", async () => {
    prismaMock.faction.findUnique.mockResolvedValue(factionRow);
    mockSdeReads({});
    const { readFactionSdeData } = require("~/app/faction/[factionId]/data");

    await readFactionSdeData(CALDARI);

    // The SDE sets factionID on the region and only overrides it lower down.
    expect(prismaMock.solarSystem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isDeleted: false,
          OR: [
            { factionId: CALDARI },
            { factionId: null, constellation: { factionId: CALDARI } },
            {
              factionId: null,
              constellation: {
                factionId: null,
                region: { factionId: CALDARI },
              },
            },
          ],
        },
      }),
    );
  });

  it("degrades the live half to empty when the database fails", async () => {
    prismaMock.corporation.findMany.mockRejectedValue(new Error("down"));
    prismaMock.alliance.findMany.mockResolvedValue([]);
    prismaMock.solarSystemSovereignty.findMany.mockResolvedValue([]);
    const { getFactionLiveData } = require("~/app/faction/[factionId]/data");

    expect(await getFactionLiveData(CALDARI, null)).toEqual({
      corporations: [],
      enlistedCorporations: [],
      enlistedCorporationCount: 0,
      enlistedPilots: 0,
      enlistedAlliances: [],
      sovereignty: [],
      lostSystems: [],
    });
  });

  it("splits sovereignty into held and lost systems", async () => {
    prismaMock.corporation.findMany
      .mockResolvedValueOnce([
        {
          corporationId: 1000180,
          name: "State Protectorate",
          ticker: "SP",
          memberCount: 1,
          size: null,
          extent: null,
          _count: { ownedStations: 0, LoyaltyStoreOffer: 5 },
        },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.corporation.aggregate.mockResolvedValue({
      _count: { corporationId: 6850 },
      _sum: { memberCount: 40000 },
    });
    prismaMock.alliance.findMany.mockResolvedValue([]);
    const sovSystem = (id: number, sdeFaction: number | null) => ({
      ...systemRow(id, 1, "R"),
      factionId: sdeFaction,
    });
    prismaMock.solarSystemSovereignty.findMany.mockResolvedValue([
      {
        solarSystemId: 1,
        factionId: CALDARI,
        allianceId: null,
        faction: { name: "Caldari State" },
        alliance: null,
        solarSystem: sovSystem(1, CALDARI),
      },
      {
        solarSystemId: 2,
        factionId: CALDARI,
        allianceId: null,
        faction: { name: "Caldari State" },
        alliance: null,
        solarSystem: sovSystem(2, 500004),
      },
      {
        solarSystemId: 3,
        factionId: 500004,
        allianceId: null,
        faction: { name: "Gallente Federation" },
        alliance: null,
        solarSystem: sovSystem(3, CALDARI),
      },
    ]);
    const { getFactionLiveData } = require("~/app/faction/[factionId]/data");

    const live = (await getFactionLiveData(
      CALDARI,
      1000180,
    )) as FactionLiveData;

    expect(live.enlistedCorporationCount).toBe(6850);
    expect(live.enlistedPilots).toBe(40000);
    expect(live.corporations[0]).toMatchObject({
      isMilitia: true,
      lpOffers: 5,
    });
    expect(
      live.sovereignty.map((s) => [s.solarSystemId, s.isHomeTerritory]),
    ).toEqual([
      [1, true],
      [2, false],
    ]);
    expect(live.lostSystems).toEqual([
      expect.objectContaining({
        solarSystemId: 3,
        occupierFactionId: 500004,
        occupierFactionName: "Gallente Federation",
      }),
    ]);
  });
});

describe("faction page (server)", () => {
  function renderServerContent(factionId: string) {
    const Page = require("~/app/faction/[factionId]/page").default;
    const tree = Page({ params: Promise.resolve({ factionId }) });
    expect(tree.type).toBe(Suspense);
    const child = tree.props.children;
    return child.type(child.props) as Promise<ReactNode>;
  }

  beforeEach(() => {
    for (const model of Object.values(prismaMock)) {
      for (const fn of Object.values(model)) fn.mockReset();
    }
  });

  it("404s an invalid id without querying", async () => {
    await expect(renderServerContent("abc")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(prismaMock.faction.findUnique).not.toHaveBeenCalled();
  });

  it("404s an unknown faction", async () => {
    prismaMock.faction.findUnique.mockResolvedValue(null);
    await expect(renderServerContent("9")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("lets a failed read throw instead of rendering a 404", async () => {
    prismaMock.faction.findUnique.mockRejectedValue(new Error("down"));
    await expect(renderServerContent(String(CALDARI))).rejects.toThrow("down");
  });
});

describe("faction page (client)", () => {
  beforeEach(() => {
    mockFwStats.mockReturnValue({ data: undefined });
    mockFwWars.mockReturnValue({ data: undefined });
    mockFwSystems.mockReturnValue({ data: undefined });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it("renders the hero and one tab per section with data", () => {
    renderClient(sdeData(), liveData());

    expect(
      screen.getByRole("heading", { name: "Caldari State" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Strength through enterprise."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ship tree" })).toHaveAttribute(
      "href",
      "/ship-tree?faction=caldari",
    );
    for (const name of [
      /Overview/,
      /Description/,
      /Territory/,
      /Corporations/,
      /Warfare/,
      /Items/,
      /Contraband/,
      /Missions & Sites/,
      /Standings/,
      /History/,
    ]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
    // Overview content: identity, races and charters.
    expect(screen.getByText("Executive corporation")).toBeInTheDocument();
    expect(screen.getByText("Home race")).toBeInTheDocument();
    expect(
      screen.getByText("Caldari State Starbase Charter"),
    ).toBeInTheDocument();
  });

  it("hides tabs a faction has nothing for", () => {
    renderClient(
      sdeData({
        militiaCorporation: null,
        items: [],
        contraband: [],
        missions: [],
        epicArcs: [],
        standingRestrictions: [],
      }),
      liveData({ corporations: [] }),
    );

    for (const name of [
      /Warfare/,
      /Items/,
      /Contraband/,
      /Missions/,
      /Standings/,
      /Corporations/,
    ]) {
      expect(screen.queryByRole("tab", { name })).not.toBeInTheDocument();
    }
  });

  it("falls back to the overview for a deep link to a hidden tab", () => {
    renderClient(sdeData({ contraband: [] }), liveData(), "?tab=contraband");

    expect(screen.getByRole("tab", { name: /Overview/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("opens the tab named in the URL", () => {
    renderClient(sdeData(), liveData(), "?tab=contraband");

    expect(screen.getByText("Exotic Dancers, Female")).toBeInTheDocument();
    expect(screen.getByText("50% of value")).toBeInTheDocument();
  });

  it("shows live Faction Warfare numbers and the warzone", () => {
    mockFwStats.mockReturnValue({
      data: {
        data: [
          {
            faction_id: CALDARI,
            pilots: 12345,
            systems_controlled: 42,
            kills: { yesterday: 10, last_week: 700, total: 99999 },
            victory_points: { yesterday: 1, last_week: 80000, total: 5 },
          },
        ],
      },
    });
    mockFwWars.mockReturnValue({
      data: {
        data: [
          { faction_id: CALDARI, against_id: 500004 },
          { faction_id: 500003, against_id: 500004 },
          { faction_id: 500004, against_id: CALDARI },
        ],
      },
    });
    mockFwSystems.mockReturnValue({
      data: {
        data: [
          {
            solar_system_id: location.solarSystemId,
            occupier_faction_id: CALDARI,
            owner_faction_id: CALDARI,
            contested: "contested",
            victory_points: 1500,
            victory_points_threshold: 3000,
          },
        ],
      },
    });

    renderClient(sdeData(), liveData(), "?tab=warfare");

    // In the hero ("Militia pilots") and in the tab's own stats.
    expect(screen.getAllByText("12,345")).toHaveLength(2);
    expect(screen.getByText("At war with")).toBeInTheDocument();
    expect(screen.getByText("Fighting alongside")).toBeInTheDocument();
    expect(screen.getByText("1,500 / 3,000 VP")).toBeInTheDocument();
    expect(screen.getByText("contested")).toBeInTheDocument();
  });
});
