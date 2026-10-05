import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type { CorporationProfileResult } from "~/app/corporation/[corporationId]/data";
import type * as PageModule from "~/app/corporation/[corporationId]/page";
import type {
  CorporationProfile,
  CorporationTables,
} from "~/app/corporation/[corporationId]/types";
import { splitCorporationProfile } from "~/app/corporation/[corporationId]/split";

const PLAYER_ID = 98000001;
const NPC_ID = 1000035;

const mockUseCorporation = jest.fn();
const mockUseSelectedCharacter = jest.fn();
const mockUseZkillboardStats = jest.fn();
const mockGetCorporationsCorporationId =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetAlliancesAllianceId =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockLoadCorporationProfile =
  jest.fn<(id: number) => Promise<CorporationProfileResult>>();
const mockConnection = jest.fn<() => Promise<void>>();
const mockUseCorporationTables = jest.fn<
  (
    id: number,
    enabled: boolean,
  ) => {
    data: CorporationTables | undefined;
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
  getCorporationsCorporationId: (...a: unknown[]) =>
    mockGetCorporationsCorporationId(...a),
  getAlliancesAllianceId: (...a: unknown[]) => mockGetAlliancesAllianceId(...a),
}));

jest.mock("@jitaspace/hooks", () => ({
  useCorporation: (id: number) => mockUseCorporation(id),
  useSelectedCharacter: () => mockUseSelectedCharacter(),
}));

jest.mock("@jitaspace/tiptap-eve", () => ({
  sanitizeFormattedEveString: (s: string) => s,
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
jest.mock("~/components/Timeline", () => ({
  CorporationAllianceHistoryTimeline: () => (
    <div>Alliance History Timeline</div>
  ),
}));
jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content?: string }) => (
    <div>{content}</div>
  ),
}));
jest.mock("~/components/Agents", () => ({
  AgentsTable: ({ agents }: { agents: { name: string }[] }) => (
    <ul>
      {agents.map((agent) => (
        <li key={agent.name}>{agent.name}</li>
      ))}
    </ul>
  ),
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

jest.mock("~/components/Zkillboard/zkillboard", () => ({
  ...jest.requireActual<object>("~/components/Zkillboard/zkillboard"),
  useZkillboardStats: (entity: { id: number }) =>
    mockUseZkillboardStats(entity.id),
}));

jest.mock("~/app/corporation/[corporationId]/tables", () => ({
  useCorporationTables: (id: number, enabled: boolean) =>
    mockUseCorporationTables(id, enabled),
}));

jest.mock("~/app/corporation/[corporationId]/data", () => ({
  loadCorporationProfile: (id: number) => mockLoadCorporationProfile(id),
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

const emptyWarSummary = {
  total: 0,
  asAggressor: 0,
  asDefender: 0,
  asAlly: 0,
  ongoing: 0,
  shipsKilled: 0,
  iskDestroyed: 0,
  shipsLost: 0,
  iskLost: 0,
};

const player: CorporationProfile = {
  corporationId: PLAYER_ID,
  name: "Stored Corp",
  ticker: "STOR",
  description: "<b>We fly</b>",
  url: "https://example.com/",
  memberCount: 42,
  taxRate: 0.1,
  dateFounded: "2015-01-01T00:00:00.000Z",
  ceo: { id: 90000001, name: "Stored CEO" },
  creator: { id: 90000002, name: "Founder" },
  alliance: { id: 99000001, name: "Stored Alliance" },
  enlistedFaction: null,
  homeStation: { id: 60003760, name: "Jita IV - Moon 4" },
  shares: "1000",
  warEligible: true,
  npc: null,
  stations: [],
  agents: [],
  agentTypes: [],
  agentDivisions: [],
  trades: [],
  wars: [
    {
      warId: 700001,
      role: "defender",
      status: "active",
      aggressorAllianceId: 99000050,
      aggressorCorporationId: null,
      defenderAllianceId: null,
      defenderCorporationId: PLAYER_ID,
      aggressorShipsKilled: 1,
      aggressorIskDestroyed: 1e8,
      defenderShipsKilled: 5,
      defenderIskDestroyed: 9e8,
      declaredDate: "2026-09-01T00:00:00.000Z",
      startedDate: "2026-09-02T00:00:00.000Z",
      finishedDate: null,
      retractedDate: null,
      isMutual: false,
      isOpenForAllies: false,
      allyCount: 0,
    },
  ],
  warSummary: { ...emptyWarSummary, total: 1, asDefender: 1, ongoing: 1 },
  readAt: READ_AT,
};

const npcProfile: CorporationProfile = {
  ...player,
  corporationId: NPC_ID,
  name: "Caldari Navy",
  ticker: "CN",
  description: null,
  url: null,
  alliance: null,
  creator: null,
  warEligible: false,
  wars: [],
  warSummary: emptyWarSummary,
  npc: {
    faction: { id: 500001, name: "Caldari State" },
    size: "H",
    sizeFactor: 2,
    extent: "N",
    memberLimit: 1000,
    minSecurity: -1,
    minimumJoinStanding: 0.5,
    initialPrice: 10000,
    hasPlayerPersonnelManager: false,
    sendCharTerminationMessage: true,
    isUnique: true,
    isDeletedByCcp: false,
    headquarters: {
      solarSystemId: 30000142,
      name: "Jita",
      securityStatus: 0.95,
      regionId: 10000002,
      regionName: "The Forge",
    },
    race: { id: 1, name: "Caldari" },
    allowedRaces: [{ id: 1, name: "Caldari" }],
    mainActivity: "Military",
    secondaryActivity: "Security",
    enemy: { id: 1000120, name: "Federal Navy Academy" },
    friend: { id: 1000044, name: "School of Applied Knowledge" },
    divisions: [
      { divisionId: 22, name: "Distribution", size: 3, leaderId: 3000001 },
    ],
    investors: [
      { corporationId: 1000002, name: "CBD Corporation", shares: 300 },
      { corporationId: 1000003, name: "Prompt Delivery", shares: 100 },
    ],
    investedIn: [],
    exchangeRates: [{ corporationId: 1000004, name: "Ytiri", rate: 0.75 }],
    lpOffers: 120,
  },
  stations: [
    {
      stationId: 60003760,
      name: "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
      typeId: 1531,
      solarSystemId: 30000142,
      solarSystemName: "Jita",
      securityStatus: 0.95,
      regionId: 10000002,
      regionName: "The Forge",
      reprocessingEfficiency: 0.5,
      officeRentalCost: 1000000,
    },
  ],
  agents: [
    {
      characterId: 3010001,
      name: "Agent Smith",
      corporationId: NPC_ID,
      agentTypeId: 2,
      agentDivisionId: 22,
      isLocator: true,
      level: 4,
      stationId: 60003760,
    },
  ],
  agentTypes: [{ agentTypeId: 2, name: "BasicAgent" }],
  agentDivisions: [{ npcCorporationDivisionId: 22, name: "Distribution" }],
  trades: [{ typeId: 34, typeName: "Tritanium", value: 1.5 }],
};

function mockEsi(data: Record<string, unknown> | undefined) {
  mockUseSelectedCharacter.mockReturnValue(null);
  mockUseCorporation.mockReturnValue({ data: data && { data } });
  mockUseZkillboardStats.mockReturnValue({
    data: { shipsDestroyed: 10, shipsLost: 5, iskDestroyed: 9, iskLost: 1 },
    isLoading: false,
    isError: false,
  });
}

function renderPage(
  corporationId: number,
  fullProfile: CorporationProfile | null,
  searchParams = "",
  tables: "loaded" | "loading" | "error" = "loaded",
) {
  const split = fullProfile ? splitCorporationProfile(fullProfile) : null;
  mockUseCorporationTables.mockReturnValue({
    data: tables === "loaded" ? split?.tables : undefined,
    isPending: tables !== "loaded",
    isError: tables === "error",
  });
  const Page = require("~/app/corporation/[corporationId]/page.client").default;
  return render(
    <MantineProvider>
      <Page corporationId={corporationId} profile={split?.page ?? null} />
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

describe("corporation page — player corporation", () => {
  it("renders the hero and overview, preferring ESI's fresher values", () => {
    mockEsi({
      name: "Fresh Corp",
      ticker: "FRSH",
      member_count: 77,
      ceo_id: 90000009,
      alliance_id: 99000001,
      tax_rates: { isk: 5, loyalty_point: 2 },
      date_founded: "2015-01-01T00:00:00Z",
      home_station_id: 60003760,
      shares: 1000,
      war_eligible: true,
      state: "active",
      friendly_fire: "illegal",
      description: "<b>We fly</b>",
      url: "https://example.com/",
    });
    renderPage(PLAYER_ID, player);

    expect(
      screen.getByRole("heading", { name: "Fresh Corp" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("[FRSH]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("77").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5%").length).toBeGreaterThan(0);
    expect(screen.getByText("2% on loyalty points")).toBeInTheDocument();
    // A CEO ESI names that our row does not: resolved by id.
    expect(
      screen.getAllByText("CharacterName:90000009").length,
    ).toBeGreaterThan(0);
    // The alliance ESI names is the one we stored, so it keeps our name.
    expect(screen.getAllByText("Stored Alliance").length).toBeGreaterThan(0);
    expect(screen.getByText("Illegal")).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByText("War record")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Wars \(1\)/ })).toBeVisible();
    expect(screen.getByRole("tab", { name: /Alliance History/ })).toBeVisible();
    // No NPC tabs for a player corporation.
    expect(screen.queryByRole("tab", { name: /Stations/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /Economy/ })).toBeNull();
    expect(
      screen.getByRole("link", { name: "DOTLAN EveMaps" }),
    ).toHaveAttribute("href", `https://evemaps.dotlan.net/corp/${PLAYER_ID}`);
  });

  it("renders from our row until ESI answers, and marks a closed corporation", () => {
    mockEsi(undefined);
    const { unmount } = renderPage(PLAYER_ID, player);
    expect(
      screen.getByRole("heading", { name: "Stored Corp" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Stored CEO").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10%").length).toBeGreaterThan(0);
    unmount();

    mockEsi({
      name: "Gone Corp",
      ticker: "GONE",
      member_count: 0,
      tax_rates: { isk: 0, loyalty_point: 0 },
      home_station_id: 60003760,
      shares: 0,
      war_eligible: false,
      state: "closed",
      friendly_fire: "legal",
      description: "",
    });
    renderPage(PLAYER_ID, null);
    expect(screen.getAllByText("Closed").length).toBeGreaterThan(0);
    expect(screen.getByText("Not in an alliance")).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Description/ })).toBeNull();
  });

  it("shows the palette stripe and colours when the corporation has one", () => {
    mockEsi({
      name: "Astral",
      ticker: "ASRO",
      member_count: 10,
      tax_rates: { isk: 10, loyalty_point: 0 },
      home_station_id: 60003760,
      shares: 1,
      war_eligible: false,
      state: "active",
      friendly_fire: "legal",
      description: "",
      palette: {
        main_color: "#0a3db0",
        secondary_color: "#f6ed0a",
        tertiary_color: "#ed1608",
      },
    });
    renderPage(PLAYER_ID, player);

    expect(
      screen.getByTestId("corporation-palette-stripe").children,
    ).toHaveLength(3);
    expect(screen.getByText("Colors")).toBeInTheDocument();
    expect(screen.getByLabelText("Main colour #0a3db0")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Tertiary colour #ed1608"),
    ).toBeInTheDocument();
  });

  it("omits the palette stripe and colours when the corporation has none", () => {
    mockEsi(undefined);
    renderPage(PLAYER_ID, player);

    expect(
      screen.queryByTestId("corporation-palette-stripe"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Colors")).not.toBeInTheDocument();
  });

  it("shows the description, alliance history and wars tabs", () => {
    mockEsi(undefined);
    const { unmount } = renderPage(PLAYER_ID, player, "?tab=description");
    expect(selectedTab()).toHaveTextContent("Description");
    expect(screen.getByText("<b>We fly</b>")).toBeInTheDocument();
    unmount();

    const history = renderPage(PLAYER_ID, player, "?tab=history");
    expect(screen.getByText("Alliance History Timeline")).toBeInTheDocument();
    history.unmount();

    renderPage(PLAYER_ID, player, "?tab=wars");
    expect(screen.getByText("#700001")).toBeInTheDocument();
    expect(screen.getByText("Defender")).toBeInTheDocument();
    expect(mockUseCorporationTables).toHaveBeenLastCalledWith(PLAYER_ID, true);
  });

  it("does not fetch rows for a tab the corporation does not have", () => {
    mockEsi(undefined);
    renderPage(PLAYER_ID, player, "?tab=stations");
    expect(selectedTab()).toHaveTextContent("Overview");
    expect(mockUseCorporationTables).toHaveBeenLastCalledWith(PLAYER_ID, false);
  });
});

describe("corporation page — NPC corporation", () => {
  it("shows the SDE's details on the overview", () => {
    mockEsi(undefined);
    renderPage(NPC_ID, npcProfile);

    expect(screen.getAllByText("NPC").length).toBeGreaterThan(0);
    expect(screen.getByText("NPC corporation")).toBeInTheDocument();
    expect(screen.getAllByText("Caldari State").length).toBeGreaterThan(0);
    expect(screen.getByText("Huge · National")).toBeInTheDocument();
    expect(screen.getByText("Also Security")).toBeInTheDocument();
    expect(screen.getByText("Federal Navy Academy")).toBeInTheDocument();
    expect(screen.getByText("120 offers")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "LP Store" })).toBeInTheDocument();
    // NPC corporations never join alliances; no history tab.
    expect(screen.queryByRole("tab", { name: /Alliance History/ })).toBeNull();
    expect(screen.getByRole("tab", { name: /Stations \(1\)/ })).toBeVisible();
    expect(screen.getByRole("tab", { name: /Agents \(1\)/ })).toBeVisible();
    expect(screen.getByRole("tab", { name: /Economy/ })).toBeVisible();
  });

  it("lists stations, agents and the economy when their tabs open", () => {
    mockEsi(undefined);
    const stations = renderPage(NPC_ID, npcProfile, "?tab=stations");
    const rows = screen.getAllByTestId("row");
    expect(rows).toHaveLength(1);
    expect(
      within(rows[0]!).getByText(
        "Jita IV - Moon 4 - Caldari Navy Assembly Plant",
      ),
    ).toBeInTheDocument();
    expect(within(rows[0]!).getByText("50%")).toBeInTheDocument();
    stations.unmount();

    const agents = renderPage(NPC_ID, npcProfile, "?tab=agents");
    expect(screen.getByText("Agent Smith")).toBeInTheDocument();
    agents.unmount();

    renderPage(NPC_ID, npcProfile, "?tab=economy");
    expect(screen.getByText("Distribution")).toBeInTheDocument();
    expect(screen.getByText("CBD Corporation")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument(); // 300 of 400 shares
    expect(screen.getByText("0.75")).toBeInTheDocument();
    expect(screen.getByText("Tritanium")).toBeInTheDocument();
  });

  it("holds the agents tab while rows load, and says so if they fail", () => {
    mockEsi(undefined);
    const { unmount } = renderPage(
      NPC_ID,
      npcProfile,
      "?tab=agents",
      "loading",
    );
    expect(screen.queryByText("Agent Smith")).toBeNull();
    unmount();

    renderPage(NPC_ID, npcProfile, "?tab=stations", "error");
    expect(
      screen.getByText(
        "Could not load this corporation's tables. Try again later.",
      ),
    ).toBeInTheDocument();
  });
});

describe("corporation page server wrapper", () => {
  // `params` is awaited in the async child, never in `Page` itself, so the
  // route keeps a synchronous shell that Next can prerender.
  function runWrapper(id: string) {
    const Page = require("~/app/corporation/[corporationId]/page").default;
    const tree = Page({ params: Promise.resolve({ corporationId: id }) });
    expect(tree.type).toBe(Suspense);
    const child = tree.props.children;
    // PageContent wraps the client page in nuqs's React adapter.
    return (
      child.type(child.props) as Promise<{
        props: {
          children: {
            props: { corporationId: number; profile: unknown };
          };
        };
      }>
    ).then((adapter) => adapter.props.children);
  }

  it("hands the client page the parsed id and the split profile", async () => {
    mockLoadCorporationProfile.mockResolvedValue({ ok: true, profile: player });
    const element = await runWrapper(String(PLAYER_ID));
    expect(element.props.corporationId).toBe(PLAYER_ID);
    expect(element.props.profile).toEqual(splitCorporationProfile(player).page);
    expect(element.props.profile).not.toHaveProperty("wars");
    expect(mockConnection).not.toHaveBeenCalled();
  });

  it("keeps a render degraded by a database failure out of the ISR cache", async () => {
    mockLoadCorporationProfile.mockResolvedValue({ ok: false });
    mockConnection.mockResolvedValue(undefined);
    const element = await runWrapper(String(PLAYER_ID));
    expect(element.props.profile).toBeNull();
    expect(mockConnection).toHaveBeenCalled();
  });

  it("lists only a placeholder id the page 404s without a query", async () => {
    const { generateStaticParams } =
      require("~/app/corporation/[corporationId]/page") as typeof PageModule;
    const params = generateStaticParams();
    expect(params).toEqual([{ corporationId: "0" }]);
    await expect(runWrapper(params[0]!.corporationId)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockLoadCorporationProfile).not.toHaveBeenCalled();
  });

  it("404s an id that isn't the canonical spelling", async () => {
    // `/corporation/98000001.0` used to serve the same corporation.
    await expect(runWrapper("98000001.0")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("describes the corporation and its alliance on the card", async () => {
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: {
        name: "Jita Corp",
        ticker: "JITA",
        description: "",
        member_count: 1234,
        alliance_id: 99000001,
      },
    });
    mockGetAlliancesAllianceId.mockResolvedValue({
      data: { name: "Big Alliance" },
    });
    const { generateMetadata } =
      require("~/app/corporation/[corporationId]/page") as typeof PageModule;

    const metadata = await generateMetadata({
      params: Promise.resolve({ corporationId: String(PLAYER_ID) }),
    });

    expect(metadata.title).toBe("Jita Corp");
    expect(metadata.alternates?.canonical).toBe(`/corporation/${PLAYER_ID}`);
    expect(metadata.description).toContain("Jita Corp [JITA]");
  });

  it("keeps the card when the alliance lookup fails", async () => {
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: {
        name: "Lone Corp",
        ticker: "LONE",
        description: "",
        member_count: 1,
        alliance_id: 99000001,
      },
    });
    mockGetAlliancesAllianceId.mockRejectedValue(new Error("404"));
    const { generateMetadata } =
      require("~/app/corporation/[corporationId]/page") as typeof PageModule;

    const metadata = await generateMetadata({
      params: Promise.resolve({ corporationId: String(PLAYER_ID) }),
    });
    expect(metadata.title).toBe("Lone Corp");
  });
});
