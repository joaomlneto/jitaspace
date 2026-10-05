import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import type { AllianceRow } from "~/app/alliances/page.client";

// ---------------------------------------------------------------------------
// /alliances is a `"use cache"` Server Component (page.tsx) that reads every
// open alliance plus per-alliance membership totals from Prisma, and a
// presentational client table (page.client.tsx). The server half is tested by
// calling it and inspecting the props it hands the client; the client half by
// rendering it.
// ---------------------------------------------------------------------------

type Rows = Record<string, unknown>[];

const allianceFindMany = jest.fn<(a?: unknown) => Promise<Rows>>();
const corporationGroupBy = jest.fn<(a?: unknown) => Promise<Rows>>();

jest.mock("~/lib/db", () => ({
  prisma: {
    alliance: { findMany: (a?: unknown) => allianceFindMany(a) },
    corporation: { groupBy: (a?: unknown) => corporationGroupBy(a) },
  },
}));

const cacheTag = jest.fn();
jest.mock("next/cache", () => ({
  cacheLife: () => undefined,
  cacheTag: (...args: unknown[]) => cacheTag(...args),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  AlliancesIcon: () => <span data-testid="alliances-icon" />,
}));

jest.mock("@jitaspace/ui", () => ({
  AllianceAnchor: ({ children }: { children?: React.ReactNode }) => (
    <span data-testid="alliance-anchor">{children}</span>
  ),
  AllianceAvatar: () => <span data-testid="alliance-avatar" />,
  CorporationAnchor: ({ children }: { children?: React.ReactNode }) => (
    <span data-testid="corporation-anchor">{children}</span>
  ),
}));

const ROWS: AllianceRow[] = [
  {
    allianceId: 1354830081,
    name: "Goonswarm Federation",
    ticker: "CONDI",
    dateFounded: "2010-06-01T00:00:00.000Z",
    executorCorporationId: 1344654522,
    executorName: "DJ's Retirement Fund",
    factionName: null,
    corporations: 809,
    pilots: 71886,
  },
  {
    allianceId: 99000001,
    name: "Executorless Alliance",
    ticker: "NOEX",
    dateFounded: "2021-09-28T00:00:00.000Z",
    executorCorporationId: null,
    executorName: null,
    factionName: "Caldari State",
    corporations: 1,
    pilots: 12,
  },
];

const renderClient = (alliances: AllianceRow[]) => {
  const Page = (
    require("~/app/alliances/page.client") as {
      default: (props: { alliances: AllianceRow[] }) => ReactElement;
    }
  ).default;
  return render(
    <MantineProvider>
      <Page alliances={alliances} />
    </MantineProvider>,
  );
};

describe("/alliances (server)", () => {
  const runPage = async () => {
    const Page = (
      require("~/app/alliances/page") as {
        default: () => Promise<ReactElement<{ alliances: AllianceRow[] }>>;
      }
    ).default;
    return await Page();
  };

  beforeEach(() => {
    allianceFindMany.mockReset();
    corporationGroupBy.mockReset();
  });

  it("joins alliances with their membership totals", async () => {
    allianceFindMany.mockResolvedValue([
      {
        allianceId: 1,
        name: "With Members",
        ticker: "WM",
        dateFounded: new Date("2010-06-01T00:00:00Z"),
        executorCorporationId: 10,
        executorCorporation: { name: "Exec Corp" },
        faction: { name: "Amarr Empire" },
      },
      {
        allianceId: 2,
        name: "Without Members",
        ticker: "WO",
        dateFounded: new Date("2020-01-01T00:00:00Z"),
        executorCorporationId: null,
        executorCorporation: null,
        faction: null,
      },
    ]);
    corporationGroupBy.mockResolvedValue([
      {
        allianceId: 1,
        _count: { corporationId: 3 },
        _sum: { memberCount: 42 },
      },
    ]);

    const element = await runPage();

    // Tagged, so /api/revalidate/alliances can mark it stale.
    expect(cacheTag).toHaveBeenCalledWith("alliances");
    expect(allianceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isDeleted: false } }),
    );
    expect(element.props.alliances).toEqual([
      {
        allianceId: 1,
        name: "With Members",
        ticker: "WM",
        dateFounded: "2010-06-01T00:00:00.000Z",
        executorCorporationId: 10,
        executorName: "Exec Corp",
        factionName: "Amarr Empire",
        corporations: 3,
        pilots: 42,
      },
      {
        allianceId: 2,
        name: "Without Members",
        ticker: "WO",
        dateFounded: "2020-01-01T00:00:00.000Z",
        executorCorporationId: null,
        executorName: null,
        factionName: null,
        corporations: 0,
        pilots: 0,
      },
    ]);
  });

  it("lets a database error propagate instead of caching a 404", async () => {
    allianceFindMany.mockRejectedValue(new Error("cluster disabled"));
    corporationGroupBy.mockResolvedValue([]);

    await expect(runPage()).rejects.toThrow("cluster disabled");
  });
});

describe("/alliances (client)", () => {
  it("renders the totals and a row per alliance", () => {
    renderClient(ROWS);

    expect(screen.getByText("Alliances")).toBeInTheDocument();
    expect(screen.getByTestId("alliances-icon")).toBeInTheDocument();
    expect(
      screen.getByText("2 open alliances, 71,898 pilots"),
    ).toBeInTheDocument();

    expect(screen.getByText("Goonswarm Federation")).toBeInTheDocument();
    expect(screen.getByText("<CONDI>")).toBeInTheDocument();
    expect(screen.getByText("71,886")).toBeInTheDocument();
    expect(screen.getByText("809")).toBeInTheDocument();
    expect(screen.getByText("DJ's Retirement Fund")).toBeInTheDocument();
    expect(screen.getByText("2010-06-01")).toBeInTheDocument();

    // An alliance without an executor renders no executor link.
    expect(screen.getByText("Executorless Alliance")).toBeInTheDocument();
    expect(screen.getAllByTestId("corporation-anchor")).toHaveLength(1);
  });

  it("renders the table chrome with no alliances", () => {
    renderClient([]);

    expect(screen.getByText("0 open alliances, 0 pilots")).toBeInTheDocument();
    expect(screen.getByText("Alliance")).toBeInTheDocument();
  });
});
