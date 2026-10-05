import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type { AllianceProfileResult } from "~/app/alliance/[allianceId]/data";
import type * as PageModule from "~/app/alliance/[allianceId]/page";
import type {
  AllianceProfile,
  AllianceTables,
} from "~/app/alliance/[allianceId]/types";
import type { ZkbStats } from "~/app/alliance/[allianceId]/zkillboard";
import { splitAllianceProfile } from "~/app/alliance/[allianceId]/split";

const ALLIANCE_ID = 99000001;

const mockUseEsiAllianceInformation = jest.fn();
const mockUseEsiAllianceMemberCorporations = jest.fn();
const mockUseSelectedCharacter = jest.fn();
const mockUseGetSovereigntyCampaigns = jest.fn();
const mockUseZkillboardAllianceStats = jest.fn();
const mockGetAlliancesAllianceId =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetCorporationsCorporationId =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockLoadAllianceProfile =
  jest.fn<(id: number) => Promise<AllianceProfileResult>>();
const mockConnection = jest.fn<() => Promise<void>>();
const mockUseAllianceTables = jest.fn<
  (
    id: number,
    enabled: boolean,
  ) => {
    data: AllianceTables | undefined;
    isPending: boolean;
    isError: boolean;
  }
>();

// The page's ESI reads run inside `"use cache"`, which Jest does not apply.
jest.mock("next/cache", () => ({ cacheLife: jest.fn(), cacheTag: jest.fn() }));
jest.mock("next/server", () => ({ connection: () => mockConnection() }));

jest.mock("next/navigation", () => ({
  useRouter: () => ({}),
  usePathname: () => "/",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// The coverage CI job runs install + test only (no `kubb:generate`), so the
// generated ESI client is stubbed out.
jest.mock("@jitaspace/esi-client", () => ({
  getAlliancesAllianceId: (...a: unknown[]) => mockGetAlliancesAllianceId(...a),
  getCorporationsCorporationId: (...a: unknown[]) =>
    mockGetCorporationsCorporationId(...a),
  useGetSovereigntyCampaigns: () => mockUseGetSovereigntyCampaigns(),
}));

jest.mock("@jitaspace/hooks", () => ({
  useEsiAllianceInformation: (id: number) => mockUseEsiAllianceInformation(id),
  useEsiAllianceMemberCorporations: (id: number) =>
    mockUseEsiAllianceMemberCorporations(id),
  useSelectedCharacter: () => mockUseSelectedCharacter(),
}));

// Entity components resolve names over ESI; here each renders its children,
// or a marker naming the entity it was given.
const entityStub = () =>
  new Proxy(
    {},
    {
      get:
        (_, name) =>
        ({
          children,
          ...props
        }: { children?: ReactNode } & Record<string, number | string>) => {
          if (children !== undefined) return <>{children}</>;
          const id = Object.entries(props).find(([key]) =>
            key.endsWith("Id"),
          )?.[1];
          return id === undefined ? null : (
            <span>{`${String(name)}:${id}`}</span>
          );
        },
    },
  );
jest.mock("@jitaspace/ui", () => {
  const stub = entityStub();
  return new Proxy(
    {},
    {
      get: (_, name) =>
        // A number formatter, not an entity: render the raw amount.
        name === "ISKAmount"
          ? ({ amount }: { amount?: number }) => <span>{amount} ISK</span>
          : (stub as Record<string | symbol, unknown>)[name],
    },
  );
});
jest.mock("@jitaspace/eve-components", () => entityStub());
jest.mock("~/components/Text", () => entityStub());

jest.mock("~/components/ActionIcon", () => ({
  OpenInformationWindowActionIcon: () => null,
}));

jest.mock("~/components/Wars/WarRoom/parts", () => ({
  WarEntity: ({
    side,
    allianceId,
    corporationId,
  }: {
    side: string;
    allianceId?: number;
    corporationId?: number;
  }) => <span>{`${side}:${allianceId ?? corporationId}`}</span>,
}));

// One <tr> per row, one cell per column, so the column renderers run.
jest.mock("~/components/DataTable", () => ({
  DataTable: ({
    data,
    columns,
    rowId,
  }: {
    data: Record<string, unknown>[];
    columns: {
      id: string;
      accessor?: string | ((row: unknown) => unknown);
      cell?: (row: unknown) => ReactNode;
    }[];
    rowId: (row: unknown) => number;
  }) => (
    <table>
      <tbody>
        {data.map((row) => (
          <tr key={rowId(row)} data-testid="row">
            {columns.map((column) => {
              let value: string | number | boolean | null | undefined;
              if (typeof column.accessor === "function") {
                value = column.accessor(row) as typeof value;
              } else if (column.accessor) {
                value = row[column.accessor] as typeof value;
              }
              return (
                <td key={column.id}>
                  {column.cell ? column.cell(row) : String(value ?? "")}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => () => <div>chart</div>,
}));

jest.mock("~/app/alliance/[allianceId]/tables", () => ({
  useAllianceTables: (id: number, enabled: boolean) =>
    mockUseAllianceTables(id, enabled),
}));

jest.mock("~/app/alliance/[allianceId]/zkillboard", () => ({
  ...jest.requireActual<object>("~/app/alliance/[allianceId]/zkillboard"),
  useZkillboardAllianceStats: (id: number) =>
    mockUseZkillboardAllianceStats(id),
}));

jest.mock("~/app/alliance/[allianceId]/data", () => ({
  loadAllianceProfile: (id: number) => mockLoadAllianceProfile(id),
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

const READ_AT = "2026-10-05T12:00:00.000Z";

const profile: AllianceProfile = {
  allianceId: ALLIANCE_ID,
  name: "Test Alliance Please Ignore",
  ticker: "TEST",
  dateFounded: "2010-05-01T10:00:00.000Z",
  isClosed: false,
  creatorCorporationId: 98000001,
  creatorCorporationName: "Founders Inc",
  executorCorporationId: 98000002,
  executorCorporationName: "Exec Corp",
  factionId: null,
  factionName: null,
  corporations: [
    {
      corporationId: 98000002,
      name: "Exec Corp",
      ticker: "EXEC",
      memberCount: 300,
      ceoId: 90000001,
      ceoName: "Big Boss",
      dateFounded: "2009-01-01T00:00:00.000Z",
      taxRate: 0.1,
      warEligible: true,
      enlistedFactionId: 500001,
      homeStationId: 60003760,
      homeStationName: "Jita IV - Moon 4",
      url: "https://example.com/",
    },
    {
      corporationId: 98000003,
      name: "Small Corp",
      ticker: "SMOL",
      memberCount: 100,
      ceoId: 90000002,
      ceoName: null,
      dateFounded: "2015-01-01T00:00:00.000Z",
      taxRate: 0.05,
      warEligible: false,
      enlistedFactionId: null,
      homeStationId: null,
      homeStationName: null,
      url: "javascript:alert(1)",
    },
  ],
  sovereignty: [
    {
      solarSystemId: 30000001,
      name: "1DQ1-A",
      securityStatus: -0.4,
      constellationId: 20000001,
      constellationName: "Constellation A",
      regionId: 10000060,
      regionName: "Delve",
      corporationId: 98000002,
      claimedSince: "2016-01-01T00:00:00.000Z",
      isCapitalSystem: true,
      sovereigntyHubId: "1000000000001",
      vulnerabilityWindowStart: "2026-10-05T18:00:00.000Z",
      vulnerabilityWindowEnd: "2026-10-05T22:00:00.000Z",
      activityDefenseMultiplier: 5.5,
      militaryLevel: 5,
      industrialLevel: 3,
      strategicLevel: 4,
    },
    {
      solarSystemId: 30000002,
      name: "T5ZI-S",
      securityStatus: -0.3,
      constellationId: 20000001,
      constellationName: "Constellation A",
      regionId: 10000060,
      regionName: "Delve",
      corporationId: null,
      claimedSince: null,
      isCapitalSystem: false,
      sovereigntyHubId: "1000000000002",
      vulnerabilityWindowStart: null,
      vulnerabilityWindowEnd: null,
      activityDefenseMultiplier: null,
      militaryLevel: null,
      industrialLevel: null,
      strategicLevel: null,
    },
  ],
  wars: [
    {
      warId: 700001,
      role: "aggressor",
      status: "active",
      aggressorAllianceId: ALLIANCE_ID,
      aggressorCorporationId: null,
      defenderAllianceId: null,
      defenderCorporationId: 98000099,
      aggressorShipsKilled: 12,
      aggressorIskDestroyed: 3e9,
      defenderShipsKilled: 2,
      defenderIskDestroyed: 1e9,
      declaredDate: "2026-09-01T00:00:00.000Z",
      startedDate: "2026-09-02T00:00:00.000Z",
      finishedDate: null,
      retractedDate: null,
      isMutual: false,
      isOpenForAllies: true,
      allyCount: 1,
    },
    {
      warId: 700002,
      role: "ally",
      status: "finished",
      aggressorAllianceId: 99000050,
      aggressorCorporationId: null,
      defenderAllianceId: 99000051,
      defenderCorporationId: null,
      aggressorShipsKilled: 0,
      aggressorIskDestroyed: 0,
      defenderShipsKilled: 0,
      defenderIskDestroyed: 0,
      declaredDate: "2025-01-01T00:00:00.000Z",
      startedDate: "2025-01-02T00:00:00.000Z",
      finishedDate: "2025-02-01T00:00:00.000Z",
      retractedDate: null,
      isMutual: true,
      isOpenForAllies: false,
      allyCount: 2,
    },
  ],
  warSummary: {
    total: 3,
    asAggressor: 1,
    asDefender: 1,
    asAlly: 1,
    ongoing: 1,
    shipsKilled: 12,
    iskDestroyed: 3e9,
    shipsLost: 2,
    iskLost: 1e9,
  },
  readAt: READ_AT,
};

const zkillStats: ZkbStats = {
  shipsDestroyed: 1000,
  shipsLost: 500,
  iskDestroyed: 9e12,
  iskLost: 1e12,
  pointsDestroyed: 4000,
  pointsLost: 2000,
  soloKills: 50,
  soloLosses: 25,
  dangerRatio: 70,
  gangRatio: 95,
  avgGangSize: 12.5,
  rankings: { alltime: { all: { ranks: { overall: 7 } } } },
  months: {
    "202608": { year: 2026, month: 8, shipsDestroyed: 10, shipsLost: 5 },
  },
  labels: {
    "loc:nullsec": { shipsDestroyed: 800, shipsLost: 300 },
    "tz:eu": { shipsDestroyed: 600, shipsLost: 200 },
  },
  activity: { max: 3, "1": { "20": 3 } },
  groups: {
    "25": { groupID: 25, shipsDestroyed: 300, shipsLost: 100 },
  },
  topAllTime: [
    { type: "character", data: [{ kills: 42, characterID: 91000001 }] },
    { type: "corporation", data: [{ kills: 400, corporationID: 98000002 }] },
    { type: "ship", data: [{ kills: 77, shipTypeID: 587 }] },
    { type: "system", data: [{ kills: 33, solarSystemID: 30000142 }] },
  ],
};

function mockEsi({
  members = [98000002, 98000003],
}: { members?: number[] } = {}) {
  mockUseSelectedCharacter.mockReturnValue(null);
  mockUseEsiAllianceInformation.mockReturnValue({
    data: {
      data: {
        name: "Test Alliance Please Ignore",
        ticker: "TEST",
        creator_id: 90000123,
        creator_corporation_id: 98000001,
        executor_corporation_id: 98000002,
        date_founded: "2010-05-01T10:00:00Z",
      },
    },
  });
  mockUseEsiAllianceMemberCorporations.mockReturnValue({
    data: { data: members },
    isLoading: false,
  });
  mockUseGetSovereigntyCampaigns.mockReturnValue({
    data: {
      data: [
        {
          campaign_id: 1,
          event_type: "ihub_defense",
          solar_system_id: 30000001,
          constellation_id: 20000001,
          defender_id: ALLIANCE_ID,
          defender_score: 0.6,
          attackers_score: 0.4,
          start_time: "2026-10-05T19:00:00Z",
        },
        {
          campaign_id: 2,
          event_type: "station_freeport",
          solar_system_id: 30000009,
          constellation_id: 20000009,
          start_time: "2026-10-05T20:00:00Z",
          participants: [{ alliance_id: ALLIANCE_ID, score: 0.25 }],
        },
        {
          campaign_id: 3,
          event_type: "tcu_defense",
          solar_system_id: 30000010,
          constellation_id: 20000010,
          defender_id: 1,
          start_time: "2026-10-05T21:00:00Z",
        },
      ],
    },
  });
  mockUseZkillboardAllianceStats.mockReturnValue({
    data: zkillStats,
    isLoading: false,
    isError: false,
  });
}

/**
 * Renders the page as the server hands it over: the profile split into the
 * page's own data and the table rows, which the (stubbed) tables hook serves.
 */
function renderPage(
  fullProfile: AllianceProfile | null = profile,
  searchParams = "",
  tables: "loaded" | "loading" | "error" = "loaded",
) {
  const split = fullProfile ? splitAllianceProfile(fullProfile) : null;
  mockUseAllianceTables.mockReturnValue({
    data: tables === "loaded" ? split?.tables : undefined,
    isPending: tables !== "loaded",
    isError: tables === "error",
  });
  const Page = require("~/app/alliance/[allianceId]/page.client").default;
  return render(
    <MantineProvider>
      <Page allianceId={ALLIANCE_ID} profile={split?.page ?? null} />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ hasMemory: true, searchParams }) },
  );
}

const selectedTab = () =>
  screen
    .getAllByRole("tab")
    .find((tab) => tab.getAttribute("aria-selected") === "true");

afterEach(() => {
  jest.clearAllMocks();
});

describe("alliance page — overview", () => {
  it("renders the hero and the overview from our database", () => {
    mockEsi();
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Test Alliance Please Ignore" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("<TEST>").length).toBeGreaterThan(0);
    expect(selectedTab()).toHaveTextContent("Overview");
    // 300 + 100 pilots, two corporations, two sov systems.
    expect(screen.getAllByText("400").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("tab", { name: /Corporations \(2\)/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("tab", { name: /Sovereignty \(2\)/ }),
    ).toBeVisible();
    expect(screen.getByRole("tab", { name: /Wars \(3\)/ })).toBeVisible();
    // Leadership, membership and the creator from ESI.
    expect(screen.getAllByText("Exec Corp").length).toBeGreaterThan(0);
    expect(screen.getByText(/Big Boss/)).toBeInTheDocument();
    expect(screen.getByText("CharacterName:90000123")).toBeInTheDocument();
    expect(screen.getByText("No longer a member")).toBeInTheDocument();
    expect(screen.getAllByText("75%").length).toBeGreaterThan(0); // executor share
    expect(screen.getByText("1 of 2")).toBeInTheDocument(); // war eligible
    expect(screen.getByText("16 years ago")).toBeInTheDocument();
    // Sovereignty, wars and killboard summaries.
    expect(screen.getAllByText("1DQ1-A").length).toBeGreaterThan(0);
    expect(screen.getByText("12 / 2")).toBeInTheDocument();
    expect(screen.getByText("#7")).toBeInTheDocument();
    // Outbound links.
    expect(
      screen.getByRole("link", { name: "DOTLAN EveMaps" }),
    ).toHaveAttribute(
      "href",
      `https://evemaps.dotlan.net/alliance/${ALLIANCE_ID}`,
    );
  });

  it("falls back to ESI alone without a database row", () => {
    mockEsi();
    mockUseZkillboardAllianceStats.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    renderPage(null, "?tab=wars");

    expect(
      screen.getByRole("heading", { name: "Test Alliance Please Ignore" }),
    ).toBeInTheDocument();
    // No sovereignty or wars without our rows; `?tab=wars` lands on overview.
    expect(screen.queryByRole("tab", { name: /Sovereignty/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /Wars/ })).toBeNull();
    expect(selectedTab()).toHaveTextContent("Overview");
    expect(screen.queryByText("Membership")).toBeNull();
    expect(
      screen.getByText("zKillboard did not answer. Try again later."),
    ).toBeInTheDocument();
  });

  it("marks a closed alliance", () => {
    mockEsi();
    renderPage({
      ...profile,
      isClosed: true,
      executorCorporationId: null,
      executorCorporationName: null,
      factionId: 500001,
      factionName: "Caldari State",
    });

    expect(screen.getAllByText("Closed").length).toBeGreaterThan(0);
    expect(
      screen.getByText("None — the alliance is closed"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Caldari State").length).toBeGreaterThan(0);
  });
});

describe("alliance page — tabs", () => {
  it("lists member corporations, including ones ESI added since the refresh", () => {
    mockEsi({ members: [98000002, 98000003, 98000004] });
    renderPage(profile, "?tab=corporations");

    const rows = screen.getAllByTestId("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText("Executor")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("example.com")).toBeInTheDocument();
    expect(
      within(rows[1]!).getByText("CharacterName:90000002"),
    ).toBeInTheDocument();
    expect(
      within(rows[2]!).getByText("CorporationName:98000004"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 corporation joined since our last hourly refresh/),
    ).toBeInTheDocument();
  });

  it("shows sovereignty holdings, regions and live campaigns", () => {
    mockEsi();
    renderPage(profile, "?tab=sovereignty");

    expect(selectedTab()).toHaveTextContent("Sovereignty");
    expect(screen.getByText("Sovereignty hub defense")).toBeInTheDocument();
    expect(screen.getByText("Station freeport")).toBeInTheDocument();
    // Another alliance's campaign is not listed.
    expect(screen.queryByText("TCU defense")).toBeNull();
    expect(screen.getByText("60% / 40%")).toBeInTheDocument();
    expect(screen.getByText("In campaign")).toBeInTheDocument();
    expect(screen.getByText("2026-10-05 18:00–22:00")).toBeInTheDocument();
    expect(screen.getAllByText("Delve").length).toBeGreaterThan(0);
  });

  it("lists wars from the alliance's side", () => {
    mockEsi();
    renderPage(profile, "?tab=wars");

    expect(screen.getAllByTestId("row")).toHaveLength(2);
    expect(screen.getByText("#700001")).toBeInTheDocument();
    expect(screen.getByText("Aggressor")).toBeInTheDocument();
    expect(screen.getByText("Ally")).toBeInTheDocument();
    expect(screen.getByText("defender:98000099")).toBeInTheDocument();
    expect(screen.getByText(/most recently declared of/)).toBeInTheDocument();
  });

  it("fetches the table rows only when a table tab opens", () => {
    mockEsi();
    renderPage(profile);
    expect(mockUseAllianceTables).toHaveBeenLastCalledWith(ALLIANCE_ID, false);
    mockUseAllianceTables.mockClear();
    renderPage(profile, "?tab=wars");
    expect(mockUseAllianceTables).toHaveBeenLastCalledWith(ALLIANCE_ID, true);
  });

  it("shows loading rows while the tables arrive, and says so if they fail", () => {
    mockEsi();
    const { unmount } = renderPage(profile, "?tab=corporations", "loading");
    // The DataTable stub renders no rows; nothing claims ESI-only members.
    expect(screen.queryAllByTestId("row")).toHaveLength(0);
    expect(
      screen.queryByText(/joined since our last hourly refresh/),
    ).toBeNull();
    unmount();

    renderPage(profile, "?tab=sovereignty", "error");
    expect(
      screen.getByText(
        "Could not load this alliance's tables. Try again later.",
      ),
    ).toBeInTheDocument();
    // The summary still renders from the page's own data.
    expect(screen.getByText("Holdings")).toBeInTheDocument();
  });

  it("shows zKillboard statistics", () => {
    mockEsi();
    renderPage(profile, "?tab=killboard");

    expect(screen.getByText("Null-sec")).toBeInTheDocument();
    expect(screen.getByText("EU")).toBeInTheDocument();
    expect(screen.getByText("CharacterName:91000001")).toBeInTheDocument();
    expect(screen.getByText("TypeName:587")).toBeInTheDocument();
    expect(screen.getByText("SolarSystemName:30000142")).toBeInTheDocument();
    expect(screen.getByText("GroupName:25")).toBeInTheDocument();
    expect(screen.getAllByText("90%").length).toBeGreaterThan(0); // ISK efficiency
  });

  it("says so when zKillboard has nothing", () => {
    mockEsi();
    mockUseZkillboardAllianceStats.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });
    renderPage(profile, "?tab=killboard");

    expect(
      screen.getByText("zKillboard has no kills or losses for this alliance."),
    ).toBeInTheDocument();
  });
});

describe("alliance page server wrapper", () => {
  // `params` is awaited in the async child, never in `Page` itself, so the
  // route keeps a synchronous shell that Next can prerender.
  function runWrapper(id: string) {
    const Page = require("~/app/alliance/[allianceId]/page").default;
    const tree = Page({ params: Promise.resolve({ allianceId: id }) });
    expect(tree.type).toBe(Suspense);
    const child = tree.props.children;
    // PageContent wraps the client page in nuqs's React adapter.
    return (
      child.type(child.props) as Promise<{
        props: {
          children: {
            props: { allianceId: number; profile: AllianceProfile | null };
          };
        };
      }>
    ).then((adapter) => adapter.props.children);
  }

  it("hands the client page the parsed id and the database profile", async () => {
    mockLoadAllianceProfile.mockResolvedValue({ ok: true, profile });
    const element = await runWrapper("99005338");
    expect(element.props.allianceId).toBe(99005338);
    // The page carries summaries; the table rows stay behind the API.
    expect(element.props.profile).toEqual(splitAllianceProfile(profile).page);
    expect(element.props.profile).not.toHaveProperty("corporations");
    expect(mockLoadAllianceProfile).toHaveBeenCalledWith(99005338);
    // A good read is cacheable: nothing opts the render out of ISR.
    expect(mockConnection).not.toHaveBeenCalled();
  });

  it("caches an alliance we have not stored, rendered from ESI", async () => {
    mockLoadAllianceProfile.mockResolvedValue({ ok: true, profile: null });
    const element = await runWrapper("99005338");
    expect(element.props.profile).toBeNull();
    expect(mockConnection).not.toHaveBeenCalled();
  });

  it("keeps a render degraded by a database failure out of the ISR cache", async () => {
    mockLoadAllianceProfile.mockResolvedValue({ ok: false });
    mockConnection.mockResolvedValue(undefined);
    const element = await runWrapper("99005338");
    expect(element.props.profile).toBeNull();
    expect(mockConnection).toHaveBeenCalled();
  });

  it("lists only a placeholder id the page 404s without a query", async () => {
    const { generateStaticParams } =
      require("~/app/alliance/[allianceId]/page") as typeof PageModule;
    const params = generateStaticParams();
    expect(params).toEqual([{ allianceId: "0" }]);
    await expect(runWrapper(params[0]!.allianceId)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockLoadAllianceProfile).not.toHaveBeenCalled();
  });

  it("404s an id that isn't the canonical spelling", async () => {
    // `/alliance/099005338` used to serve the same alliance as `/alliance/99005338`.
    await expect(runWrapper("099005338")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("canonicalises onto the parsed id and describes the alliance's size", async () => {
    mockGetAlliancesAllianceId.mockResolvedValue({
      data: {
        name: "Pandemic Horde",
        ticker: "REKTD",
        date_founded: "2015-05-20T10:00:00Z",
        executor_corporation_id: 98000002,
      },
    });
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: { name: "Exec Corp" },
    });
    mockLoadAllianceProfile.mockResolvedValue({ ok: true, profile });
    const { generateMetadata } =
      require("~/app/alliance/[allianceId]/page") as typeof PageModule;

    const metadata = await generateMetadata({
      params: Promise.resolve({ allianceId: "99005338" }),
    });

    expect(metadata.alternates?.canonical).toBe("/alliance/99005338");
    expect(metadata.description).toContain(
      "400 pilots in 2 corporations and holds sovereignty over 2 systems",
    );
    expect(metadata.title).toBe("Pandemic Horde");
  });

  it("leaves metadata empty when ESI does not know the alliance", async () => {
    mockGetAlliancesAllianceId.mockRejectedValue(new Error("404"));
    mockLoadAllianceProfile.mockResolvedValue({ ok: false });
    const { generateMetadata } =
      require("~/app/alliance/[allianceId]/page") as typeof PageModule;

    await expect(
      generateMetadata({ params: Promise.resolve({ allianceId: "99005338" }) }),
    ).resolves.toEqual({});
  });
});
