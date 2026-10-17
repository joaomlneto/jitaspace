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
import { cleanup, render, screen, within } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type * as DataModule from "~/app/station/[stationId]/data";
import type { StationPageData } from "~/app/station/[stationId]/types";

// ---------------------------------------------------------------------------
// /station/[stationId] reads one cached SDE half on the server (data.ts) and
// renders a tabbed client page: Overview, Services, Agents and History.
// ---------------------------------------------------------------------------

type Query = (args?: unknown) => Promise<unknown>;

const prismaMock = {
  station: { findUnique: jest.fn<Query>() },
  moon: { findUnique: jest.fn<Query>() },
  planet: { findUnique: jest.fn<Query>() },
  star: { findUnique: jest.fn<Query>() },
  stationOperation: { findUnique: jest.fn<Query>() },
  corporationActivity: { findUnique: jest.fn<Query>() },
  stationService: { findMany: jest.fn<Query>() },
  stationStandingsRestriction: { findMany: jest.fn<Query>() },
  schoolStartingStation: { findMany: jest.fn<Query>() },
  race: { findMany: jest.fn<Query>() },
  corporation: { findMany: jest.fn<Query>() },
};

jest.mock("~/lib/db", () => ({ prisma: prismaMock }));
jest.mock("~/lib/sdeCache", () => ({ cacheSdeRead: () => undefined }));

// Next's notFound() throws; mirror that so "was it called" is observable.
const notFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({}),
  usePathname: () => "/",
  notFound: () => notFound(),
}));

const mockUseStation = jest.fn();
const mockUseSelectedCharacter = jest.fn();
jest.mock("@jitaspace/hooks", () => ({
  useStation: (id: number) => mockUseStation(id),
  useSelectedCharacter: () => mockUseSelectedCharacter(),
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

jest.mock("~/components/ActionIcon", () => ({
  SetAutopilotDestinationActionIcon: () => <div>Set destination</div>,
  OpenInformationWindowActionIcon: () => null,
}));

jest.mock("~/components/Text", () => ({
  RaceName: () => <span>Race name</span>,
}));

jest.mock("~/components/Agents", () => ({
  AgentsTable: ({
    agents,
    withLocation,
  }: {
    agents: { name: string }[];
    withLocation?: boolean;
  }) => (
    <div data-testid="agents-table">
      {agents.map((agent) => agent.name).join(", ")}
      {withLocation === false && " (no location column)"}
    </div>
  ),
}));

// The page reads the entity's change history on the server; stub that read
// (it loads `next/server`, which jsdom cannot).
const mockLoadEntityHistory = jest.fn<
  (entityType: string, entityId: number) => Promise<unknown>
>(() => Promise.resolve(null));
jest.mock("~/lib/history-entity-page", () => ({
  loadEntityHistory: (entityType: string, entityId: number) =>
    mockLoadEntityHistory(entityType, entityId),
}));
jest.mock("~/app/history/EntityHistory", () => ({
  EmbeddedEntityHistory: ({
    history,
  }: {
    history: { entityId: number } | null;
  }) => (
    <div data-testid="entity-history">
      {history ? `history of ${history.entityId}` : "no history"}
    </div>
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

const JITA_44 = 60003760;
const CALDARI_NAVY = 1000035;
const TRIGLAVIAN = 500026;

const stationRow = (overrides: Record<string, unknown> = {}) => ({
  name: "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
  typeId: 52678,
  stationType: { name: "Caldari Navy Assembly Plant" },
  raceId: 1,
  race: { name: "Caldari" },
  ownerId: CALDARI_NAVY,
  owner: {
    name: "Caldari Navy",
    factionId: 500001,
    faction: { name: "Caldari State" },
  },
  solarSystem: {
    solarSystemId: 30000142,
    name: "Jita",
    securityStatus: { toNumber: () => 0.946 },
    constellation: {
      constellationId: 20000020,
      name: "Kimotoro",
      regionId: 10000002,
      region: { name: "The Forge" },
    },
  },
  operationId: 14,
  orbitId: 40009087,
  reprocessingEfficiency: 0.5,
  reprocessingStationsTake: 0.05,
  maxDockableShipVolume: 50_000_000,
  officeRentalCost: 7_130_006_102,
  Agent: [
    {
      characterId: 3_018_000,
      Character: { name: "Zariel Ahnah", corporationId: CALDARI_NAVY },
      agentTypeId: 2,
      AgentType: { name: "BasicAgent" },
      agentDivisionId: 24,
      AgentDivision: { name: "Security" },
      isLocator: false,
      level: 1,
    },
    {
      characterId: 3_018_001,
      Character: { name: "Aakari Ahnah", corporationId: CALDARI_NAVY },
      agentTypeId: 2,
      AgentType: { name: "BasicAgent" },
      agentDivisionId: 22,
      AgentDivision: { name: "Distribution" },
      isLocator: true,
      level: 4,
    },
  ],
  ...overrides,
});

function mockSdeReads() {
  prismaMock.station.findUnique.mockResolvedValue(stationRow());
  prismaMock.moon.findUnique.mockResolvedValue({
    name: "Jita IV - Moon 4",
    planetId: 40009077,
    planet: { name: "Jita IV" },
  });
  prismaMock.planet.findUnique.mockResolvedValue(null);
  prismaMock.star.findUnique.mockResolvedValue(null);
  prismaMock.stationOperation.findUnique.mockResolvedValue({
    operationName: "Assembly Plant",
    description: "Builds things.",
    activityId: 5,
    manufacturingFactor: 0.95,
    researchFactor: 0.98,
    services: [{ serviceId: 25 }, { serviceId: 5 }],
  });
  prismaMock.corporationActivity.findUnique.mockResolvedValue({
    name: "Military",
  });
  prismaMock.stationService.findMany.mockResolvedValue([
    { stationServiceId: 25, name: "Loyalty Point Store", description: "" },
    {
      stationServiceId: 5,
      name: "Reprocessing Plant",
      description: "Reprocesses.",
    },
  ]);
  prismaMock.stationStandingsRestriction.findMany.mockResolvedValue([]);
  prismaMock.schoolStartingStation.findMany.mockResolvedValue([
    { school: { schoolId: 17, name: "State War Academy", raceId: 1 } },
  ]);
  prismaMock.race.findMany.mockResolvedValue([{ raceId: 1, name: "Caldari" }]);
  prismaMock.corporation.findMany.mockResolvedValue([
    { corporationId: CALDARI_NAVY, name: "Caldari Navy" },
  ]);
}

const loadData = () =>
  require("~/app/station/[stationId]/data") as typeof DataModule;

beforeEach(() => {
  for (const model of Object.values(prismaMock))
    for (const mock of Object.values(model)) mock.mockReset();
  notFound.mockClear();
  mockLoadEntityHistory.mockClear();
});

describe("readStation", () => {
  it("is null for a station we have not stored", async () => {
    prismaMock.station.findUnique.mockResolvedValue(null);
    await expect(loadData().readStation(999)).resolves.toBeNull();
    expect(prismaMock.stationOperation.findUnique).not.toHaveBeenCalled();
  });

  it("is null for a station the SDE dropped", async () => {
    prismaMock.station.findUnique.mockResolvedValue(
      stationRow({ isDeleted: true }),
    );
    await expect(loadData().readStation(JITA_44)).resolves.toBeNull();
  });

  it("looks a moon orbit up alone, without the planet and star reads", async () => {
    mockSdeReads();
    await loadData().readStation(JITA_44);
    expect(prismaMock.planet.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.star.findUnique).not.toHaveBeenCalled();
  });

  it("gathers the station, its orbit, operation, services and agents", async () => {
    mockSdeReads();
    const station = await loadData().readStation(JITA_44);

    expect(station).toMatchObject({
      stationId: JITA_44,
      name: "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
      type: { id: 52678, name: "Caldari Navy Assembly Plant" },
      owner: { id: CALDARI_NAVY, name: "Caldari Navy" },
      faction: { id: 500001, name: "Caldari State" },
      location: {
        solarSystem: { id: 30000142, name: "Jita" },
        securityStatus: 0.946,
        constellation: { id: 20000020, name: "Kimotoro" },
        region: { id: 10000002, name: "The Forge" },
      },
      orbit: {
        kind: "moon",
        id: 40009087,
        name: "Jita IV - Moon 4",
        planet: { id: 40009077, name: "Jita IV" },
      },
      operation: {
        id: 14,
        name: "Assembly Plant",
        activity: { id: 5, name: "Military" },
      },
      schools: [
        {
          schoolId: 17,
          name: "State War Academy",
          race: { id: 1, name: "Caldari" },
        },
      ],
      headquarters: [{ id: CALDARI_NAVY, name: "Caldari Navy" }],
    });
    // Services in id order; an empty SDE description is no description.
    expect(station?.services).toEqual([
      {
        serviceId: 5,
        name: "Reprocessing Plant",
        description: "Reprocesses.",
        minimumStanding: null,
      },
      {
        serviceId: 25,
        name: "Loyalty Point Store",
        description: null,
        minimumStanding: null,
      },
    ]);
    // Highest level first, each with its corporation and station.
    expect(station?.agents.map((agent) => agent.name)).toEqual([
      "Aakari Ahnah",
      "Zariel Ahnah",
    ]);
    expect(station?.agents[0]).toMatchObject({
      corporationId: CALDARI_NAVY,
      stationId: JITA_44,
    });
    expect(station?.agentDivisions).toEqual([
      { npcCorporationDivisionId: 24, name: "Security" },
      { npcCorporationDivisionId: 22, name: "Distribution" },
    ]);
  });

  it("lists only NPC corporations as headquartered here", async () => {
    mockSdeReads();
    await loadData().readStation(JITA_44);
    expect(prismaMock.corporation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          homeStationId: JITA_44,
          corporationId: { gte: 1_000_000, lte: 2_000_000 },
        }),
      }),
    );
  });

  it("marks the services the owner's faction restricts by standing", async () => {
    mockSdeReads();
    prismaMock.station.findUnique.mockResolvedValue(
      stationRow({
        owner: {
          name: "Veles Clade",
          factionId: TRIGLAVIAN,
          faction: { name: "Triglavian Collective" },
        },
      }),
    );
    prismaMock.stationStandingsRestriction.findMany.mockResolvedValue([
      { stationServiceId: 5, minimumStanding: 3 },
    ]);

    const station = await loadData().readStation(JITA_44);

    expect(
      prismaMock.stationStandingsRestriction.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ factionId: TRIGLAVIAN }),
      }),
    );
    expect(
      station?.services.find((service) => service.serviceId === 5)
        ?.minimumStanding,
    ).toBe(3);
  });

  it("skips the restriction read for an owner without a faction", async () => {
    mockSdeReads();
    prismaMock.station.findUnique.mockResolvedValue(
      stationRow({ ownerId: null, owner: null }),
    );
    const station = await loadData().readStation(JITA_44);
    expect(
      prismaMock.stationStandingsRestriction.findMany,
    ).not.toHaveBeenCalled();
    expect(station?.owner).toBeNull();
    expect(station?.faction).toBeNull();
  });

  it("names a planet or star orbit, and none for an unknown celestial", async () => {
    mockSdeReads();
    prismaMock.moon.findUnique.mockResolvedValue(null);
    prismaMock.star.findUnique.mockResolvedValue({ name: "Zarzakh - Star" });
    await expect(loadData().readStation(JITA_44)).resolves.toMatchObject({
      orbit: { kind: "star", name: "Zarzakh - Star", planet: null },
    });

    prismaMock.star.findUnique.mockResolvedValue(null);
    await expect(loadData().readStation(JITA_44)).resolves.toMatchObject({
      orbit: null,
    });
  });

  it("lets a database failure throw out of the cached scope", async () => {
    mockSdeReads();
    prismaMock.stationOperation.findUnique.mockRejectedValue(
      new Error("Too many database connections opened"),
    );
    await expect(loadData().readStation(JITA_44)).rejects.toThrow(
      "Too many database connections opened",
    );
  });
});

// `Page` returns <Suspense> wrapping the async <PageContent>, which is where
// `await params` and the database read happen. jsdom's renderer will not await
// an async component, so pull the inner element out and invoke it directly.
async function resolvePageContent(stationId: string) {
  const Page = require("~/app/station/[stationId]/page").default;
  const suspenseEl = Page({ params: Promise.resolve({ stationId }) });
  expect(suspenseEl.type).toBe(Suspense);
  const contentEl = suspenseEl.props.children as {
    type: (props: unknown) => Promise<ReactNode>;
    props: unknown;
  };
  return contentEl.type(contentEl.props);
}

describe("station page (server)", () => {
  it("hands the client the station and its history, under nuqs's React adapter", async () => {
    mockSdeReads();
    mockLoadEntityHistory.mockResolvedValue({ entityId: JITA_44 });

    const tree = (await resolvePageContent(String(JITA_44))) as {
      props: { children: { props: Record<string, unknown> } };
    };
    const props = tree.props.children.props;

    expect(props.station).toMatchObject({ stationId: JITA_44 });
    expect(props.history).toEqual({ entityId: JITA_44 });
    expect(mockLoadEntityHistory).toHaveBeenCalledWith("npcStation", JITA_44);
  });

  it("renders the not-found page for a station id no row matches", async () => {
    prismaMock.station.findUnique.mockResolvedValue(null);
    await expect(resolvePageContent("999999999")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it.each(["0", "060003760", "60003760.0", "bad", ""])(
    "reaches not-found rather than serving a second URL for %p",
    async (stationId) => {
      await expect(resolvePageContent(stationId)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
      expect(prismaMock.station.findUnique).not.toHaveBeenCalled();
    },
  );

  it("lets a database failure escape instead of reaching not-found", async () => {
    // A caught failure would be stored as a successful 404 in the ISR cache;
    // throwing keeps the route transient.
    prismaMock.station.findUnique.mockRejectedValue(
      new Error("Too many database connections opened"),
    );
    await expect(resolvePageContent(String(JITA_44))).rejects.toThrow(
      "Too many database connections opened",
    );
    expect(notFound).not.toHaveBeenCalled();
  });

  it("lists one placeholder param, which 404s without a query", () => {
    const { generateStaticParams } = require("~/app/station/[stationId]/page");
    expect(generateStaticParams()).toEqual([{ stationId: "0" }]);
  });
});

describe("station page metadata", () => {
  it("describes the station and canonicalises onto the parsed id", async () => {
    mockSdeReads();
    const { generateMetadata } = await import("~/app/station/[stationId]/page");

    const metadata = await generateMetadata({
      params: Promise.resolve({ stationId: String(JITA_44) }),
    });

    expect(metadata.title).toBe(
      "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
    );
    expect(metadata.description).toContain("in Jita, operated by Caldari Navy");
    expect(metadata.alternates?.canonical).toBe("/station/60003760");
  });

  it("counts a single agent in the singular", async () => {
    mockSdeReads();
    prismaMock.station.findUnique.mockResolvedValue(
      stationRow({ Agent: stationRow().Agent.slice(0, 1) }),
    );
    const { generateMetadata } = await import("~/app/station/[stationId]/page");

    const metadata = await generateMetadata({
      params: Promise.resolve({ stationId: String(JITA_44) }),
    });

    expect(metadata.description).toContain("See its services, 1 agent,");
  });

  it("emits no metadata for a station we do not have", async () => {
    prismaMock.station.findUnique.mockResolvedValue(null);
    const { generateMetadata } = await import("~/app/station/[stationId]/page");
    expect(
      await generateMetadata({
        params: Promise.resolve({ stationId: String(JITA_44) }),
      }),
    ).toEqual({});
  });

  it.each(["0", "060003760", "60003760.0"])(
    "emits no metadata at all for %p",
    async (stationId) => {
      const { generateMetadata } =
        await import("~/app/station/[stationId]/page");
      expect(
        await generateMetadata({ params: Promise.resolve({ stationId }) }),
      ).toEqual({});
      expect(prismaMock.station.findUnique).not.toHaveBeenCalled();
    },
  );
});

const stationData = (
  overrides: Partial<StationPageData> = {},
): StationPageData => ({
  stationId: JITA_44,
  name: "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
  type: { id: 52678, name: "Caldari Navy Assembly Plant" },
  race: { id: 1, name: "Caldari" },
  owner: { id: CALDARI_NAVY, name: "Caldari Navy" },
  faction: { id: 500001, name: "Caldari State" },
  location: {
    solarSystem: { id: 30000142, name: "Jita" },
    securityStatus: 0.946,
    constellation: { id: 20000020, name: "Kimotoro" },
    region: { id: 10000002, name: "The Forge" },
  },
  orbit: {
    kind: "moon",
    id: 40009087,
    name: "Jita IV - Moon 4",
    planet: { id: 40009077, name: "Jita IV" },
  },
  operation: {
    id: 14,
    name: "Assembly Plant",
    description: "Builds things.",
    activity: { id: 5, name: "Military" },
    manufacturingFactor: 0.95,
    researchFactor: 0.98,
  },
  services: [
    {
      serviceId: 5,
      name: "Reprocessing Plant",
      description: null,
      minimumStanding: 3,
    },
    {
      serviceId: 25,
      name: "Loyalty Point Store",
      description: null,
      minimumStanding: null,
    },
  ],
  reprocessingEfficiency: 0.5,
  reprocessingStationsTake: 0.05,
  maxDockableShipVolume: 50_000_000,
  officeRentalCost: null,
  schools: [],
  headquarters: [],
  agents: [
    {
      characterId: 3_018_001,
      name: "Aakari Ahnah",
      corporationId: CALDARI_NAVY,
      agentTypeId: 2,
      agentDivisionId: 22,
      isLocator: true,
      level: 4,
      stationId: JITA_44,
    },
  ],
  agentTypes: [{ agentTypeId: 2, name: "BasicAgent" }],
  agentDivisions: [{ npcCorporationDivisionId: 22, name: "Distribution" }],
  ...overrides,
});

function renderClient(station: StationPageData, searchParams = "") {
  const Page = require("~/app/station/[stationId]/page.client").default;
  return render(
    <MantineProvider>
      <Page station={station} history={null} />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ searchParams }) },
  );
}

const hrefs = () =>
  screen.getAllByRole("link").map((a) => a.getAttribute("href"));

describe("station page (client)", () => {
  beforeEach(() => {
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseStation.mockReturnValue({ data: undefined });
  });
  afterEach(() => {
    cleanup();
  });

  it("renders the server-read station before ESI answers", () => {
    renderClient(stationData());

    // What a crawler is served: the name, location and outgoing links, with
    // no ESI response at all.
    expect(
      screen.getByRole("heading", {
        name: "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
      }),
    ).toBeInTheDocument();
    expect(hrefs()).toEqual(
      expect.arrayContaining([
        "/system/30000142",
        "/type/52678",
        "/planet/40009077",
        "https://evemaps.dotlan.net/station/60003760",
      ]),
    );
    expect(screen.getByText("Assembly Plant", { selector: "p" })).toBeVisible();
    expect(screen.getByText("50,000,000 m³")).toBeInTheDocument();
  });

  it("shows one tab per section with data", () => {
    renderClient(stationData());
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toEqual(["Overview", "Services (2)", "Agents (1)", "History"]);
  });

  it("hides the Services and Agents tabs when the station has none", () => {
    renderClient(stationData({ services: [], agents: [] }), "?tab=agents");
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toEqual(["Overview", "History"]);
    // A tab the station has no data for falls back to the overview.
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("lists each service with its standing restriction and LP store link", () => {
    renderClient(stationData(), "?tab=services");
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Reprocessing Plant")).toBeInTheDocument();
    expect(within(panel).getByText("Standing ≥ 3.00")).toBeInTheDocument();
    expect(within(panel).getByText("with Caldari State")).toBeInTheDocument();
    expect(
      within(panel).getByText("50% base yield, 5% station take"),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("link", { name: "Browse the LP store" }),
    ).toHaveAttribute("href", "/lp-store/Caldari_Navy");
    expect(within(panel).getByText("×0.95")).toBeInTheDocument();
  });

  it("renders the agents table without its location column", () => {
    renderClient(stationData(), "?tab=agents");
    expect(screen.getByTestId("agents-table")).toHaveTextContent(
      "Aakari Ahnah (no location column)",
    );
  });

  it("renders the change history on its tab", () => {
    renderClient(stationData(), "?tab=history");
    expect(screen.getByTestId("entity-history")).toHaveTextContent(
      "no history",
    );
  });

  it("prefers ESI's name and owner once it answers", () => {
    mockUseStation.mockReturnValue({
      data: {
        data: {
          name: "Jita IV - Moon 4 - Renamed Assembly Plant",
          owner: 1000036,
          office_rental_cost: 1_500_000,
        },
      },
    });
    renderClient(stationData());

    expect(
      screen.getByRole("heading", {
        name: "Jita IV - Moon 4 - Renamed Assembly Plant",
      }),
    ).toBeInTheDocument();
    // The server's owner name no longer labels the corporation, nor does its
    // faction, which belonged to the old owner.
    expect(screen.queryByText("Caldari Navy")).not.toBeInTheDocument();
    expect(screen.queryByText("Caldari State")).not.toBeInTheDocument();
    // ESI's office rent, which our row did not have: in the hero and overview.
    expect(screen.getAllByText("Office rent")).toHaveLength(2);
  });

  it("names ESI's race when our row has none", () => {
    mockUseStation.mockReturnValue({ data: { data: { race_id: 1 } } });
    renderClient(stationData({ race: null }));
    expect(screen.getByText("Race")).toBeInTheDocument();
    expect(screen.getByText("Race name")).toBeInTheDocument();
  });

  it("hides standing restrictions once ESI names another owner", () => {
    mockUseStation.mockReturnValue({ data: { data: { owner: 1000036 } } });
    renderClient(stationData(), "?tab=services");
    expect(screen.queryByText("Standing ≥ 3.00")).not.toBeInTheDocument();
  });

  it("renders a station the SDE left unplaced without an undefined link", () => {
    renderClient(
      stationData({
        location: null,
        orbit: null,
        race: null,
        owner: null,
        faction: null,
        operation: null,
      }),
    );
    expect(hrefs().some((href) => href?.includes("undefined"))).toBe(false);
  });

  it("offers the autopilot action to a signed-in character", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 12345 });
    renderClient(stationData());
    expect(screen.getByText("Set destination")).toBeInTheDocument();
  });
});
