import "@testing-library/jest-dom/jest-globals";

import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import type { FactionRow } from "~/app/factions/page.client";

// ---------------------------------------------------------------------------
// /factions is a `"use cache"` Server Component (page.tsx) that reads every
// faction, the SDE's territory and the NPC corporation and item counts, and a
// presentational client table (page.client.tsx).
// ---------------------------------------------------------------------------

type Rows = Record<string, unknown>[];
type Query = (args?: unknown) => Promise<Rows>;

const factionFindMany = jest.fn<Query>();
const solarSystemFindMany = jest.fn<Query>();
const corporationGroupBy = jest.fn<Query>();
const typeGroupBy = jest.fn<Query>();

jest.mock("~/lib/db", () => ({
  prisma: {
    faction: { findMany: (a?: unknown) => factionFindMany(a) },
    solarSystem: { findMany: (a?: unknown) => solarSystemFindMany(a) },
    corporation: { groupBy: (a?: unknown) => corporationGroupBy(a) },
    type: { groupBy: (a?: unknown) => typeGroupBy(a) },
  },
}));

const cacheTag = jest.fn();
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  cacheTag: (...args: unknown[]) => cacheTag(...args),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  FactionalWarfareIcon: () => <span data-testid="factions-icon" />,
}));

const anchor =
  (testId: string) =>
  ({ children }: { children?: ReactNode }) => (
    <span data-testid={testId}>{children}</span>
  );
jest.mock("@jitaspace/ui", () => ({
  CorporationAnchor: anchor("corporation-anchor"),
  FactionAvatar: () => <span data-testid="faction-avatar" />,
  SolarSystemSecurityStatusBadge: () => <span data-testid="sec-badge" />,
}));
jest.mock("@jitaspace/eve-components", () => ({
  FactionAnchor: anchor("faction-anchor"),
  RegionAnchor: anchor("region-anchor"),
  SolarSystemAnchor: anchor("system-anchor"),
}));

const CALDARI = 500001;
const GALLENTE = 500004;

const factionRow = (overrides: Record<string, unknown> = {}) => ({
  factionId: CALDARI,
  name: "Caldari State",
  shortDescription: "Strength through enterprise.",
  stationCount: 1535,
  stationSystemCount: 534,
  sizeFactor: 5,
  militiaCorporationId: 1000180,
  militiaCorporation: { name: "State Protectorate" },
  solarSystem: {
    solarSystemId: 30000145,
    name: "New Caldari",
    securityStatus: { toString: () => "0.946" },
    constellation: { region: { regionId: 10000002, name: "The Forge" } },
  },
  ...overrides,
});

/** A system owned at one level of the SDE's region → constellation → system. */
const system = (
  own: number | null,
  constellation: number | null,
  region: number | null,
) => ({
  factionId: own,
  constellation: { factionId: constellation, region: { factionId: region } },
});

const runPage = async () => {
  const Page = (
    require("~/app/factions/page") as {
      default: () => Promise<ReactElement<{ factions: FactionRow[] }>>;
    }
  ).default;
  return await Page();
};

describe("/factions (server)", () => {
  beforeEach(() => {
    factionFindMany.mockReset().mockResolvedValue([]);
    solarSystemFindMany.mockReset().mockResolvedValue([]);
    corporationGroupBy.mockReset().mockResolvedValue([]);
    typeGroupBy.mockReset().mockResolvedValue([]);
    cacheTag.mockReset();
  });

  it("counts territory the way the SDE assigns it, region down to system", async () => {
    factionFindMany.mockResolvedValue([
      factionRow(),
      factionRow({
        factionId: GALLENTE,
        name: "Gallente Federation",
        militiaCorporationId: null,
        militiaCorporation: null,
        solarSystem: null,
      }),
    ]);
    solarSystemFindMany.mockResolvedValue([
      system(CALDARI, null, null), // its own
      system(null, CALDARI, GALLENTE), // the constellation's, over the region's
      system(null, null, CALDARI), // the region's
      system(GALLENTE, CALDARI, CALDARI), // an override the other way
      system(null, null, null), // nobody's
    ]);
    corporationGroupBy.mockResolvedValue([
      { factionId: CALDARI, _count: { corporationId: 61 } },
    ]);
    typeGroupBy.mockResolvedValue([
      { factionId: GALLENTE, _count: { typeId: 90 } },
    ]);

    const element = await runPage();

    // Only SDE tables: cached until the next ingest.
    expect(cacheTag).toHaveBeenCalledWith("sde");
    expect(factionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isDeleted: false } }),
    );
    expect(element.props.factions).toEqual([
      {
        factionId: CALDARI,
        name: "Caldari State",
        shortDescription: "Strength through enterprise.",
        systems: 3,
        stations: 1535,
        stationSystems: 534,
        corporations: 61,
        items: 0,
        sizeFactor: 5,
        militiaCorporationId: 1000180,
        militiaName: "State Protectorate",
        headquartersId: 30000145,
        headquartersName: "New Caldari",
        headquartersSecurity: 0.946,
        regionId: 10000002,
        regionName: "The Forge",
      },
      expect.objectContaining({
        factionId: GALLENTE,
        systems: 1,
        corporations: 0,
        items: 90,
        militiaCorporationId: null,
        headquartersId: null,
        regionId: null,
      }),
    ]);
  });

  it.each([
    ["factions", factionFindMany],
    ["solar systems", solarSystemFindMany],
    ["corporation counts", corporationGroupBy],
    ["item counts", typeGroupBy],
  ])(
    "lets a failed %s read throw instead of caching a broken page",
    async (_label, query) => {
      query.mockRejectedValue(new Error("cluster disabled"));
      await expect(runPage()).rejects.toThrow("cluster disabled");
    },
  );
});

describe("/factions (client)", () => {
  const renderClient = (factions: FactionRow[]) => {
    const Page = (
      require("~/app/factions/page.client") as {
        default: (props: { factions: FactionRow[] }) => ReactElement;
      }
    ).default;
    return render(
      <MantineProvider>
        <Page factions={factions} />
      </MantineProvider>,
    );
  };

  const ROW: FactionRow = {
    factionId: CALDARI,
    name: "Caldari State",
    shortDescription: "Strength through enterprise.",
    systems: 423,
    stations: 1535,
    stationSystems: 534,
    corporations: 61,
    items: 102,
    sizeFactor: 5,
    militiaCorporationId: 1000180,
    militiaName: "State Protectorate",
    headquartersId: 30000145,
    headquartersName: "New Caldari",
    headquartersSecurity: 0.946,
    regionId: 10000002,
    regionName: "The Forge",
  };

  it("renders the totals and a row per faction", () => {
    renderClient([
      ROW,
      {
        ...ROW,
        factionId: 500013,
        name: "EverMore",
        shortDescription: null,
        systems: 1,
        stations: 16,
        stationSystems: 6,
        corporations: 10,
        items: 0,
        headquartersId: 30005204,
        headquartersName: "Ourapheh",
        regionId: 10000067,
        regionName: "Genesis",
        militiaCorporationId: null,
        militiaName: null,
      },
    ]);

    expect(screen.getByRole("heading", { name: "Factions" })).toBeVisible();
    expect(
      screen.getByText("2 factions, 1 of them at war in Faction Warfare"),
    ).toBeInTheDocument();
    expect(screen.getByText("Caldari State")).toBeInTheDocument();
    expect(
      screen.getByText("Strength through enterprise."),
    ).toBeInTheDocument();
    expect(screen.getByText("423")).toBeInTheDocument();
    expect(screen.getByText("1,535")).toBeInTheDocument();
    expect(screen.getByText("New Caldari")).toBeInTheDocument();
    expect(screen.getByText("The Forge")).toBeInTheDocument();
    expect(screen.getByText("State Protectorate")).toBeInTheDocument();
    expect(screen.getByText("EverMore")).toBeInTheDocument();
    // One militia, so one faction marked at war.
    expect(screen.getAllByText("At war")).toHaveLength(1);
  });
});
