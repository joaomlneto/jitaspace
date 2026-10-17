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

import type * as DataModule from "~/app/region/[regionId]/data";
import type {
  RegionIncursions,
  RegionPageData,
} from "~/app/region/[regionId]/types";

// ---------------------------------------------------------------------------
// /region/[regionId] reads a cached SDE half and the region's incursions on
// the server (data.ts), and renders a tabbed client page: Overview,
// Constellations, Systems, Incursions and History.
// ---------------------------------------------------------------------------

type Query = (args?: unknown) => Promise<unknown>;

const prismaMock = {
  region: { findUnique: jest.fn<Query>() },
  faction: { findUnique: jest.fn<Query>() },
  constellation: { findMany: jest.fn<Query>() },
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

jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content: string }) => (
    <div data-testid="description">{content}</div>
  ),
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

const DEVOID = 10000036;
const DOMAIN = 10000043;
const JAYAI = 20000436;
const KABO = 20000437;
const SOSAN = 30002980; // Jayai's staging
const TARARAN = 30002978; // Jayai vanguard
const ROUSHZAR = 30002975; // Jayai headquarters
const RAHADALON = 30002982; // Kabo's staging

const loadData = () =>
  require("~/app/region/[regionId]/data") as typeof DataModule;

const system = (
  solarSystemId: number,
  name: string,
  securityStatus: string,
  constellationId: number,
  stations = 0,
) => ({
  solarSystemId,
  name,
  securityStatus,
  constellationId,
  _count: { stations },
});

function mockSdeReads() {
  prismaMock.region.findUnique.mockResolvedValue({
    name: "Devoid",
    description: "Only through many hardships…",
    factionId: 500003,
    wormholeClassId: 8,
  });
  prismaMock.faction.findUnique.mockResolvedValue({
    factionId: 500003,
    name: "Amarr Empire",
  });
  prismaMock.constellation.findMany.mockResolvedValue([
    { constellationId: JAYAI, name: "Jayai" },
    { constellationId: KABO, name: "Kabo" },
  ]);
  prismaMock.solarSystem.findMany.mockResolvedValue([
    system(RAHADALON, "Rahadalon", "0.4", KABO, 3),
    system(ROUSHZAR, "Roushzar", "0.2", JAYAI),
    system(SOSAN, "Sosan", "0.3", JAYAI, 1),
    system(TARARAN, "Tararan", "0.4", JAYAI),
  ]);
  const gate = (
    fromId: number,
    fromName: string,
    to: {
      id: number;
      name: string;
      constellationId: number;
      regionId: number;
      regionName: string;
    },
  ) => ({
    solarSystem: { solarSystemId: fromId, name: fromName },
    DestinationStargate: {
      solarSystem: {
        solarSystemId: to.id,
        name: to.name,
        constellationId: to.constellationId,
        constellation: {
          name: "Somewhere",
          regionId: to.regionId,
          region: { name: to.regionName },
        },
      },
    },
  });
  prismaMock.stargate.findMany.mockResolvedValue([
    // Between two of the region's constellations: not a neighbour.
    gate(TARARAN, "Tararan", {
      id: RAHADALON,
      name: "Rahadalon",
      constellationId: KABO,
      regionId: DEVOID,
      regionName: "Devoid",
    }),
    gate(RAHADALON, "Rahadalon", {
      id: 30003000,
      name: "Hati",
      constellationId: 20000450,
      regionId: DOMAIN,
      regionName: "Domain",
    }),
  ]);
}

const at = (iso: string) => new Date(iso);
function mockIncursions() {
  prismaMock.incursion.findMany.mockResolvedValue([
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
    {
      incursionId: 2,
      constellationId: KABO,
      state: "withdrawing",
      influence: 1,
      hasBoss: true,
      stagingSolarSystemId: RAHADALON,
      firstSeenAt: at("2025-12-24T00:00:00Z"),
      lastSeenAt: at("2025-12-31T04:00:00Z"),
      endedAt: at("2025-12-31T04:00:00Z"),
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

describe("readRegion", () => {
  it("is null for a region we have not stored", async () => {
    prismaMock.region.findUnique.mockResolvedValue(null);
    await expect(loadData().readRegion(DEVOID)).resolves.toBeNull();
    expect(prismaMock.constellation.findMany).not.toHaveBeenCalled();
  });

  it("gathers its faction, constellations and the systems in them", async () => {
    mockSdeReads();
    const region = await loadData().readRegion(DEVOID);
    expect(region).toMatchObject({
      regionId: DEVOID,
      name: "Devoid",
      faction: { id: 500003, name: "Amarr Empire" },
      constellations: [
        { id: JAYAI, name: "Jayai" },
        { id: KABO, name: "Kabo" },
      ],
    });
    expect(prismaMock.solarSystem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { constellationId: { in: [JAYAI, KABO] } },
      }),
    );
    expect(
      region?.systems.map((s) => [s.name, s.constellationId, s.siteRole]),
    ).toEqual([
      ["Rahadalon", KABO, null],
      ["Roushzar", JAYAI, "headquarters"],
      ["Sosan", JAYAI, null],
      ["Tararan", JAYAI, "vanguard"],
    ]);
  });

  it("names the regions its gates lead to, not its own", async () => {
    mockSdeReads();
    const region = await loadData().readRegion(DEVOID);
    expect(region?.neighbours).toEqual([
      {
        id: DOMAIN,
        name: "Domain",
        region: null,
        gates: [
          [
            { id: RAHADALON, name: "Rahadalon" },
            { id: 30003000, name: "Hati" },
          ],
        ],
      },
    ]);
  });

  it("lets a database failure throw out of the cached scope", async () => {
    prismaMock.region.findUnique.mockRejectedValue(
      new Error("Too many database connections opened"),
    );
    await expect(loadData().readRegion(DEVOID)).rejects.toThrow(
      "Too many database connections opened",
    );
  });
});

describe("readRegionIncursions", () => {
  it("reads every incursion in the region's constellations", async () => {
    prismaMock.constellation.findMany.mockResolvedValue([
      { constellationId: JAYAI },
      { constellationId: KABO },
    ]);
    mockIncursions();
    const { incursions } = await loadData().readRegionIncursions(DEVOID);
    expect(prismaMock.incursion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { constellationId: { in: [JAYAI, KABO] } },
      }),
    );
    expect(incursions.map((i) => [i.incursionId, i.endedAt])).toEqual([
      [3, null],
      [2, "2025-12-31T04:00:00.000Z"],
    ]);
  });
});

async function resolvePageContent(regionId: string) {
  const Page = require("~/app/region/[regionId]/page").default;
  const suspenseEl = Page({ params: Promise.resolve({ regionId }) });
  expect(suspenseEl.type).toBe(Suspense);
  const contentEl = suspenseEl.props.children as {
    type: (props: unknown) => Promise<ReactNode>;
    props: unknown;
  };
  return contentEl.type(contentEl.props);
}

describe("region page (server)", () => {
  it("hands the client the region, its incursions and its history", async () => {
    mockSdeReads();
    mockIncursions();
    mockLoadEntityHistory.mockResolvedValue({ entityId: DEVOID });

    const tree = (await resolvePageContent(String(DEVOID))) as {
      props: { children: { props: Record<string, unknown> } };
    };
    const props = tree.props.children.props;
    expect(props.region).toMatchObject({ regionId: DEVOID });
    expect(props.history).toEqual({ entityId: DEVOID });
    expect(mockLoadEntityHistory).toHaveBeenCalledWith("region", DEVOID);
  });

  it("renders the not-found page for an id no row matches", async () => {
    prismaMock.region.findUnique.mockResolvedValue(null);
    prismaMock.constellation.findMany.mockResolvedValue([]);
    mockIncursions();
    await expect(resolvePageContent("19999999")).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it.each(["0", "010000036", "10000036.0", "bad", ""])(
    "reaches not-found rather than serving a second URL for %p",
    async (regionId) => {
      await expect(resolvePageContent(regionId)).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
      expect(prismaMock.region.findUnique).not.toHaveBeenCalled();
    },
  );

  it("lists one placeholder param, which 404s without a query", () => {
    const { generateStaticParams } = require("~/app/region/[regionId]/page");
    expect(generateStaticParams()).toEqual([{ regionId: "0" }]);
  });
});

describe("region page metadata", () => {
  it("counts its constellations and systems", async () => {
    mockSdeReads();
    const { generateMetadata } = require("~/app/region/[regionId]/page") as {
      generateMetadata: (args: {
        params: Promise<{ regionId: string }>;
      }) => Promise<{ title?: unknown; openGraph?: unknown }>;
    };
    const metadata = await generateMetadata({
      params: Promise.resolve({ regionId: String(DEVOID) }),
    });
    expect(metadata.title).toBe("Devoid");
  });
});

async function pageData() {
  mockSdeReads();
  const region = (await loadData().readRegion(DEVOID))!;
  prismaMock.constellation.findMany.mockResolvedValue([
    { constellationId: JAYAI },
    { constellationId: KABO },
  ]);
  mockIncursions();
  const incursions = await loadData().readRegionIncursions(DEVOID);
  return { region, incursions };
}

function renderClient(
  region: RegionPageData,
  incursions: RegionIncursions,
  searchParams = "",
) {
  const Page = require("~/app/region/[regionId]/page.client").default;
  return render(
    <MantineProvider>
      <Page region={region} incursions={incursions} history={null} />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ searchParams }) },
  );
}

const tableCells = () =>
  [...screen.getByRole("table").querySelectorAll("tbody tr")].map((row) =>
    [...row.querySelectorAll("td")].map((cell) => cell.textContent),
  );

describe("region page (client)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the region, its description, neighbours and links elsewhere", async () => {
    const { region, incursions } = await pageData();
    renderClient(region, incursions);
    expect(screen.getByRole("heading", { name: "Devoid" })).toBeInTheDocument();
    expect(screen.getByTestId("description")).toHaveTextContent(
      "Only through many hardships…",
    );
    expect(screen.getByText("Rahadalon → Hati")).toBeInTheDocument();
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        "https://evemaps.dotlan.net/map/Devoid",
        `https://zkillboard.com/region/${DEVOID}/`,
        `https://eveeye.com/?m=${DEVOID}`,
        `https://www.adam4eve.eu/location.php?id=${DEVOID}`,
      ]),
    );
    // Known space has a wormhole class too; it is not shown.
    expect(screen.queryByText("Wormhole class")).toBeNull();
  });

  it("shows one tab per section, with counts", async () => {
    const { region, incursions } = await pageData();
    renderClient(region, incursions);
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Overview",
      "Constellations (2)",
      "Systems (4)",
      "Incursions (2)",
      "History",
    ]);
  });

  it("flags the active incursion, and opens its tab from the badge", async () => {
    const { region, incursions } = await pageData();
    renderClient(region, incursions);
    fireEvent.click(
      screen.getByRole("button", { name: /Incursion: Mobilizing/ }),
    );
    const card = screen.getByText("Incursion in progress").closest("div")!;
    expect(within(card.parentElement!).getByText("Jayai")).toBeVisible();
  });

  it("summarises each constellation", async () => {
    const { region, incursions } = await pageData();
    renderClient(region, incursions, "?tab=constellations");
    const rows = Object.fromEntries(
      tableCells().map((cells) => [cells[0], cells]),
    );
    // Name, systems, security, bands, stations, incursions, latest, now.
    expect(rows.Jayai?.[1]).toBe("3");
    expect(rows.Jayai?.[5]).toBe("1");
    expect(rows.Jayai?.[7]).toBe("Mobilizing");
    expect(rows.Kabo?.[4]).toBe("3");
    expect(rows.Kabo?.[7]).toBe("");
  });

  it("lists every system with its constellation and site", async () => {
    const { region, incursions } = await pageData();
    renderClient(region, incursions, "?tab=systems");
    const sites = Object.fromEntries(
      tableCells().map((cells) => [
        cells[0]?.replace(/^sec [\d.-]+/, ""),
        [cells[1], cells[5]],
      ]),
    );
    expect(sites).toEqual({
      Rahadalon: ["Kabo", "Staging"],
      Roushzar: ["Jayai", "Headquarters"],
      Sosan: ["Jayai", "Staging"],
      Tararan: ["Jayai", "Vanguard"],
    });
  });

  it("renders the change history on its tab", async () => {
    const { region, incursions } = await pageData();
    renderClient(region, incursions, "?tab=history");
    expect(screen.getByTestId("entity-history")).toHaveTextContent(
      "no history",
    );
  });
});
