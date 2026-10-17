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
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type * as DataModule from "~/app/constellation/[constellationId]/data";
import type {
  ConstellationIncursions,
  ConstellationPageData,
} from "~/app/constellation/[constellationId]/types";

// ---------------------------------------------------------------------------
// /constellation/[constellationId] reads a cached SDE half and the
// constellation's incursions on the server (data.ts), and renders a tabbed
// client page: Overview, Systems, Incursions and History.
// ---------------------------------------------------------------------------

type Query = (args?: unknown) => Promise<unknown>;

const prismaMock = {
  constellation: { findUnique: jest.fn<Query>() },
  faction: { findUnique: jest.fn<Query>() },
  solarSystem: { findMany: jest.fn<Query>() },
  stargate: { findMany: jest.fn<Query>() },
  incursion: { findMany: jest.fn<Query>() },
};

jest.mock("~/lib/db", () => ({ prisma: prismaMock }));
jest.mock("~/lib/sdeCache", () => ({
  cacheSdeRead: () => undefined,
  SDE_CACHE_TAG: "sde",
}));

const notFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
jest.mock("next/navigation", () => ({
  useRouter: () => ({}),
  usePathname: () => "/",
  notFound: () => notFound(),
}));

jest.mock("@jitaspace/eve-icons", () => {
  const Icon = () => null;
  return new Proxy({}, { get: () => Icon });
});

// The shared stub, plus what this page needs from the real package.
jest.mock("@jitaspace/ui", () => ({
  ...jest.requireActual<Record<string, unknown>>("@jitaspace/ui"),
  securityStatusBand: (securityStatus: number) => {
    if (Math.round(securityStatus * 10) / 10 >= 0.5) return "High-Sec";
    return securityStatus > 0 ? "Low-Sec" : "Null-Sec";
  },
  SolarSystemSecurityStatusBadge: ({
    securityStatus,
  }: {
    securityStatus: number;
  }) => <span>{`sec ${securityStatus}`}</span>,
}));

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

// Jayai (Devoid): its layout is in the inferred site roles.
const JAYAI = 20000436;
const DEVOID = 10000036;
const SOSAN = 30002980; // staging
const TARARAN = 30002978; // vanguard
const LABAPI = 30002976; // assault
const ROUSHZAR = 30002975; // headquarters
const NEIGHBOUR = 20000437; // Kabo

const loadData = () =>
  require("~/app/constellation/[constellationId]/data") as typeof DataModule;

function mockSdeReads() {
  prismaMock.constellation.findUnique.mockResolvedValue({
    name: "Jayai",
    regionId: DEVOID,
    region: { name: "Devoid" },
    factionId: 500003,
    wormholeClassId: null,
  });
  prismaMock.faction.findUnique.mockResolvedValue({
    factionId: 500003,
    name: "Amarr Empire",
  });
  prismaMock.solarSystem.findMany.mockResolvedValue([
    {
      solarSystemId: LABAPI,
      name: "Labapi",
      securityStatus: "0.3",
      constellationId: JAYAI,
      _count: { stations: 2 },
    },
    {
      solarSystemId: ROUSHZAR,
      name: "Roushzar",
      securityStatus: "0.2",
      constellationId: JAYAI,
      _count: { stations: 0 },
    },
    {
      solarSystemId: SOSAN,
      name: "Sosan",
      securityStatus: "0.3",
      constellationId: JAYAI,
      _count: { stations: 1 },
    },
    {
      solarSystemId: TARARAN,
      name: "Tararan",
      securityStatus: "0.4",
      constellationId: JAYAI,
      _count: { stations: 0 },
    },
  ]);
  const gate = (
    fromId: number,
    fromName: string,
    to: Record<string, unknown> | null,
  ) => ({
    solarSystem: { solarSystemId: fromId, name: fromName },
    DestinationStargate: to && { solarSystem: to },
  });
  prismaMock.stargate.findMany.mockResolvedValue([
    // Inside the constellation: not a neighbour.
    gate(SOSAN, "Sosan", {
      solarSystemId: TARARAN,
      name: "Tararan",
      constellationId: JAYAI,
      constellation: {
        name: "Jayai",
        regionId: DEVOID,
        region: { name: "Devoid" },
      },
    }),
    gate(TARARAN, "Tararan", {
      solarSystemId: 30002982,
      name: "Rahadalon",
      constellationId: NEIGHBOUR,
      constellation: {
        name: "Kabo",
        regionId: DEVOID,
        region: { name: "Devoid" },
      },
    }),
    gate(LABAPI, "Labapi", {
      solarSystemId: 30002984,
      name: "Soosat",
      constellationId: NEIGHBOUR,
      constellation: {
        name: "Kabo",
        regionId: DEVOID,
        region: { name: "Devoid" },
      },
    }),
    // A gate whose destination we have not stored.
    gate(ROUSHZAR, "Roushzar", null),
  ]);
}

const at = (iso: string) => new Date(iso);
function mockIncursions(active = true) {
  prismaMock.incursion.findMany.mockResolvedValue([
    ...(active
      ? [
          {
            incursionId: 3,
            constellationId: JAYAI,
            state: "mobilizing",
            influence: 0.6,
            hasBoss: false,
            stagingSolarSystemId: SOSAN,
            firstSeenAt: at("2026-10-15T10:00:00Z"),
            lastSeenAt: at("2026-10-17T12:00:00Z"),
            endedAt: null,
          },
        ]
      : []),
    {
      incursionId: 2,
      constellationId: JAYAI,
      state: "withdrawing",
      influence: 1,
      hasBoss: true,
      stagingSolarSystemId: SOSAN,
      firstSeenAt: at("2025-12-24T00:00:00Z"),
      lastSeenAt: at("2025-12-31T04:00:00Z"),
      endedAt: at("2025-12-31T04:00:00Z"),
    },
    {
      incursionId: 1,
      constellationId: JAYAI,
      state: "withdrawing",
      influence: null,
      hasBoss: null,
      stagingSolarSystemId: null,
      firstSeenAt: at("2016-01-01T00:00:00Z"),
      lastSeenAt: at("2016-01-04T00:00:00Z"),
      endedAt: at("2016-01-04T00:00:00Z"),
    },
  ]);
}

beforeEach(() => {
  for (const model of Object.values(prismaMock)) {
    for (const fn of Object.values(model)) fn.mockReset();
  }
  notFound.mockClear();
  mockLoadEntityHistory.mockReset().mockResolvedValue(null);
});

describe("readConstellation", () => {
  it("is null for a constellation we have not stored", async () => {
    prismaMock.constellation.findUnique.mockResolvedValue(null);
    await expect(loadData().readConstellation(JAYAI)).resolves.toBeNull();
    expect(prismaMock.solarSystem.findMany).not.toHaveBeenCalled();
  });

  it("gathers its systems, their stations and site roles, and its faction", async () => {
    mockSdeReads();
    const constellation = await loadData().readConstellation(JAYAI);
    expect(constellation).toMatchObject({
      constellationId: JAYAI,
      name: "Jayai",
      region: { id: DEVOID, name: "Devoid" },
      faction: { id: 500003, name: "Amarr Empire" },
    });
    expect(
      constellation?.systems.map((s) => [
        s.name,
        s.securityStatus,
        s.stationCount,
        s.siteRole,
      ]),
    ).toEqual([
      ["Labapi", 0.3, 2, "assault"],
      ["Roushzar", 0.2, 0, "headquarters"],
      ["Sosan", 0.3, 1, null],
      ["Tararan", 0.4, 0, "vanguard"],
    ]);
  });

  it("groups the gates that leave the constellation by where they lead", async () => {
    mockSdeReads();
    const constellation = await loadData().readConstellation(JAYAI);
    expect(constellation?.neighbours).toEqual([
      {
        id: NEIGHBOUR,
        name: "Kabo",
        region: { id: DEVOID, name: "Devoid" },
        gates: [
          [
            { id: LABAPI, name: "Labapi" },
            { id: 30002984, name: "Soosat" },
          ],
          [
            { id: TARARAN, name: "Tararan" },
            { id: 30002982, name: "Rahadalon" },
          ],
        ],
      },
    ]);
  });

  it("skips the faction read for a constellation without one", async () => {
    mockSdeReads();
    prismaMock.constellation.findUnique.mockResolvedValue({
      name: "J-space",
      regionId: 11000001,
      region: null,
      factionId: null,
      wormholeClassId: 3,
    });
    const constellation = await loadData().readConstellation(21000001);
    expect(prismaMock.faction.findUnique).not.toHaveBeenCalled();
    expect(constellation).toMatchObject({
      faction: null,
      wormholeClassId: 3,
      region: { id: 11000001, name: null },
    });
  });

  it("lets a database failure throw out of the cached scope", async () => {
    prismaMock.constellation.findUnique.mockRejectedValue(
      new Error("Too many database connections opened"),
    );
    await expect(loadData().readConstellation(JAYAI)).rejects.toThrow(
      "Too many database connections opened",
    );
  });
});

describe("readConstellationIncursions", () => {
  it("lists them most recent first, with dates as ISO strings", async () => {
    mockIncursions();
    const { incursions } = await loadData().readConstellationIncursions(JAYAI);
    expect(prismaMock.incursion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { constellationId: { in: [JAYAI] } },
        orderBy: { firstSeenAt: "desc" },
      }),
    );
    expect(
      incursions.map((i) => [i.incursionId, i.firstSeenAt, i.endedAt]),
    ).toEqual([
      [3, "2026-10-15T10:00:00.000Z", null],
      [2, "2025-12-24T00:00:00.000Z", "2025-12-31T04:00:00.000Z"],
      [1, "2016-01-01T00:00:00.000Z", "2016-01-04T00:00:00.000Z"],
    ]);
  });
});

// `Page` returns <Suspense> wrapping the async <PageContent>; jsdom will not
// await an async component, so invoke it directly.
async function resolvePageContent(constellationId: string) {
  const Page = require("~/app/constellation/[constellationId]/page").default;
  const suspenseEl = Page({ params: Promise.resolve({ constellationId }) });
  expect(suspenseEl.type).toBe(Suspense);
  const contentEl = suspenseEl.props.children as {
    type: (props: unknown) => Promise<ReactNode>;
    props: unknown;
  };
  return contentEl.type(contentEl.props);
}

describe("constellation page (server)", () => {
  it("hands the client the constellation, its incursions and its history", async () => {
    mockSdeReads();
    mockIncursions();
    mockLoadEntityHistory.mockResolvedValue({ entityId: JAYAI });

    const tree = (await resolvePageContent(String(JAYAI))) as {
      props: { children: { props: Record<string, unknown> } };
    };
    const props = tree.props.children.props;
    expect(props.constellation).toMatchObject({ constellationId: JAYAI });
    expect(props.incursions).toMatchObject({
      incursions: expect.arrayContaining([
        expect.objectContaining({ incursionId: 3 }),
      ]),
    });
    expect(props.history).toEqual({ entityId: JAYAI });
    expect(mockLoadEntityHistory).toHaveBeenCalledWith("constellation", JAYAI);
  });

  it("renders the not-found page for an id no row matches", async () => {
    prismaMock.constellation.findUnique.mockResolvedValue(null);
    mockIncursions();
    await expect(resolvePageContent("29999999")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it.each(["0", "020000436", "20000436.0", "bad", ""])(
    "reaches not-found rather than serving a second URL for %p",
    async (constellationId) => {
      await expect(resolvePageContent(constellationId)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
      expect(prismaMock.constellation.findUnique).not.toHaveBeenCalled();
    },
  );

  it("lets a database failure escape instead of reaching not-found", async () => {
    prismaMock.constellation.findUnique.mockRejectedValue(
      new Error("Too many database connections opened"),
    );
    mockIncursions();
    await expect(resolvePageContent(String(JAYAI))).rejects.toThrow(
      "Too many database connections opened",
    );
    expect(notFound).not.toHaveBeenCalled();
  });

  it("lists one placeholder param, which 404s without a query", () => {
    const {
      generateStaticParams,
    } = require("~/app/constellation/[constellationId]/page");
    expect(generateStaticParams()).toEqual([{ constellationId: "0" }]);
  });
});

describe("constellation page metadata", () => {
  const generateMetadata = (constellationId: string) =>
    (
      require("~/app/constellation/[constellationId]/page") as {
        generateMetadata: (args: {
          params: Promise<{ constellationId: string }>;
        }) => Promise<Record<string, unknown>>;
      }
    ).generateMetadata({ params: Promise.resolve({ constellationId }) });

  it("describes the constellation and canonicalises onto the parsed id", async () => {
    mockSdeReads();
    const metadata = await generateMetadata(String(JAYAI));
    expect(metadata.title).toBe("Jayai");
    expect(String(metadata.description)).toContain(
      "Jayai is a constellation in the Devoid region of EVE Online, spanning 4 solar systems.",
    );
    expect(metadata.alternates).toMatchObject({
      canonical: `/constellation/${JAYAI}`,
    });
  });

  it("emits no metadata for a constellation we do not have", async () => {
    prismaMock.constellation.findUnique.mockResolvedValue(null);
    await expect(generateMetadata(String(JAYAI))).resolves.toEqual({});
  });
});

async function pageData(active = true) {
  mockSdeReads();
  mockIncursions(active);
  const data = loadData();
  return {
    constellation: (await data.readConstellation(JAYAI))!,
    incursions: await data.readConstellationIncursions(JAYAI),
  };
}

function renderClient(
  constellation: ConstellationPageData,
  incursions: ConstellationIncursions,
  searchParams = "",
) {
  const Page =
    require("~/app/constellation/[constellationId]/page.client").default;
  return render(
    <MantineProvider>
      <Page
        constellation={constellation}
        incursions={incursions}
        history={null}
      />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ searchParams }) },
  );
}

describe("constellation page (client)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the server-read constellation, its region, faction and neighbours", async () => {
    const { constellation, incursions } = await pageData();
    renderClient(constellation, incursions);
    expect(screen.getByRole("heading", { name: "Jayai" })).toBeInTheDocument();
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/faction/500003",
        "https://evemaps.dotlan.net/map/Devoid/Jayai",
      ]),
    );
    // The region (breadcrumb) and the neighbour, by the anchors' stub text.
    expect(screen.getByText("Devoid")).toBeInTheDocument();
    expect(screen.getByText("Kabo")).toBeInTheDocument();
    expect(screen.getByText("Tararan → Rahadalon")).toBeInTheDocument();
  });

  it("shows one tab per section, Incursions with its count", async () => {
    const { constellation, incursions } = await pageData();
    renderClient(constellation, incursions);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Overview",
      "Systems (4)",
      "Incursions (3)",
      "History",
    ]);
  });

  it("hides the Incursions tab for a constellation with neither a layout nor incursions", async () => {
    const { constellation } = await pageData();
    renderClient(
      {
        ...constellation,
        systems: constellation.systems.map((s) => ({ ...s, siteRole: null })),
      },
      { readAt: "2026-10-17T12:00:00.000Z", incursions: [] },
    );
    expect(screen.queryByRole("tab", { name: /Incursions/ })).toBeNull();
  });

  it("flags an active incursion in the header, and opens its tab from there", async () => {
    const { constellation, incursions } = await pageData();
    renderClient(constellation, incursions);
    fireEvent.click(
      screen.getByRole("button", { name: /Incursion: Mobilizing/ }),
    );
    expect(screen.getByText("Incursion in progress")).toBeVisible();
  });

  it("lays out the sites, with the latest staging system", async () => {
    const { constellation, incursions } = await pageData(false);
    renderClient(constellation, incursions, "?tab=incursions");
    expect(screen.queryByText("Incursion in progress")).toBeNull();
    const card = (label: string) =>
      within(
        screen
          .getAllByText(label, { selector: "p" })[0]!
          .closest<HTMLElement>("div.mantine-Paper-root")!,
      );
    expect(card("Staging").getByRole("link", { name: "Sosan" })).toBeVisible();
    expect(
      card("Vanguard (1)").getByRole("link", { name: "Tararan" }),
    ).toBeVisible();
    expect(
      card("Assault (1)").getByRole("link", { name: "Labapi" }),
    ).toBeVisible();
    expect(
      card("Headquarters (1)").getByRole("link", { name: "Roushzar" }),
    ).toBeVisible();
    // Two past incursions, one of which reached the boss.
    expect(card("Incursions").getByText("2")).toBeVisible();
    expect(card("Reached the boss").getByText("1")).toBeVisible();
  });

  it("lists each system's site in the Systems tab", async () => {
    const { constellation, incursions } = await pageData();
    renderClient(constellation, incursions, "?tab=systems");
    const rows = screen.getByRole("table").querySelectorAll("tbody tr");
    const sites = Object.fromEntries(
      [...rows].map((row) => {
        const cells = row.querySelectorAll("td");
        return [
          cells[0]?.textContent.replace(/^sec [\d.-]+/, ""),
          cells[4]?.textContent,
        ];
      }),
    );
    expect(sites).toEqual({
      Labapi: "Assault",
      Roushzar: "Headquarters",
      Sosan: "Staging",
      Tararan: "Vanguard",
    });
  });

  it("renders the change history on its tab", async () => {
    const { constellation, incursions } = await pageData();
    renderClient(constellation, incursions, "?tab=history");
    expect(screen.getByTestId("entity-history")).toHaveTextContent(
      "no history",
    );
  });
});
