import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { Suspense } from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type { CharacterRecordResult } from "~/app/character/[characterId]/data";
import type * as PageModule from "~/app/character/[characterId]/page";
import type {
  CharacterRecord,
  EsiCharacterCard,
} from "~/app/character/[characterId]/types";

const PLAYER_ID = 90000001;
const AGENT_ID = 3019582;

const mockUseEsiCharacter = jest.fn();
const mockUseCorporationHistory = jest.fn();
const mockUseSelectedCharacter = jest.fn();
const mockUseAuthenticatedCharacter = jest.fn();
const mockUseZkillboardStats = jest.fn();
const mockGetCharactersDetail =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetCorporationsCorporationId =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockGetAlliancesAllianceId =
  jest.fn<(...args: unknown[]) => Promise<unknown>>();
const mockLoadCharacterRecord =
  jest.fn<(id: number) => Promise<CharacterRecordResult>>();
const mockConnection = jest.fn<() => Promise<void>>();

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
  getCharactersDetail: (...a: unknown[]) => mockGetCharactersDetail(...a),
  getCorporationsCorporationId: (...a: unknown[]) =>
    mockGetCorporationsCorporationId(...a),
  getAlliancesAllianceId: (...a: unknown[]) => mockGetAlliancesAllianceId(...a),
  useGetCharactersCharacterIdCorporationhistory: (id: number) =>
    mockUseCorporationHistory(id),
}));

jest.mock("@jitaspace/hooks", () => ({
  useEsiCharacter: (id: number) => mockUseEsiCharacter(id),
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useAuthenticatedCharacter: (id: number) => mockUseAuthenticatedCharacter(id),
  useCharacterWalletBalance: () => ({ data: { data: 1234 }, isAllowed: true }),
  useCharacterSkills: () => ({
    data: { data: { total_sp: 5_000_000 } },
    hasToken: true,
  }),
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
jest.mock("~/components/Card", () => ({
  CharacterLocationCard: () => <div>Location card</div>,
  CharacterSkillTrainingCard: () => <div>Training card</div>,
}));
jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content?: string }) => (
    <div>{content}</div>
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

jest.mock("~/app/character/[characterId]/data", () => ({
  loadCharacterRecord: (id: number) => mockLoadCharacterRecord(id),
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

const card: EsiCharacterCard = {
  name: "Jita Trader",
  birthday: "2010-10-05T12:00:00Z",
  gender: "female",
  raceId: 1,
  bloodlineId: 2,
  corporation: { id: 98000001, name: "Trade Corp" },
  alliance: { id: 99000001, name: "Trade Alliance" },
  factionId: null,
  securityStatus: 4.2,
  title: "<b>Director</b>",
  description: "<b>Buy low</b>",
  achievementScore: 1234,
  readAt: "2026-10-05T12:00:00.000Z",
};

const agentRecord: CharacterRecord = {
  name: "Agent Smith",
  corporation: { id: 1000035, name: "Caldari Navy" },
  race: { id: 1, name: "Caldari" },
  bloodline: { id: 2, name: "Civire" },
  ancestry: { id: 7, name: "Mercs" },
  faction: { id: 500001, name: "Caldari State" },
  gender: "male",
  title: null,
  description: null,
  securityStatus: null,
  isUnique: true,
  agent: {
    agentType: { id: 4, name: "ResearchAgent" },
    division: { id: 22, name: "Distribution" },
    level: 4,
    isLocator: true,
    isCeo: false,
    startDate: "2003-03-12T20:04:00.000Z",
    station: {
      stationId: 60003760,
      name: "Jita IV - Moon 4",
      solarSystemId: 30000142,
      solarSystemName: "Jita",
      securityStatus: 0.95,
      regionId: 10000002,
      regionName: "The Forge",
    },
    inSpace: {
      dungeon: { id: 4000, name: "Hidden Outpost" },
      solarSystem: { id: 30000144, name: "Perimeter" },
      type: { id: 12345, name: "Command Post" },
    },
    researchSkills: [{ id: 11433, name: "High Energy Physics" }],
  },
  ceoOf: [{ id: 1000035, name: "Caldari Navy" }],
  founded: [],
};

const history = [
  { record_id: 1, corporation_id: 1000167, start_date: "2010-10-05T12:00:00Z" },
  {
    record_id: 2,
    corporation_id: 98000001,
    start_date: "2016-10-05T12:00:00Z",
  },
];

function mockClient({
  live,
  authenticated = false,
}: { live?: Record<string, unknown>; authenticated?: boolean } = {}) {
  mockUseSelectedCharacter.mockReturnValue(null);
  mockUseEsiCharacter.mockReturnValue({ data: live && { data: live } });
  mockUseCorporationHistory.mockReturnValue({
    data: { data: history },
    isLoading: false,
  });
  mockUseAuthenticatedCharacter.mockReturnValue(
    authenticated ? { sessionExpired: false } : undefined,
  );
  mockUseZkillboardStats.mockReturnValue({
    data: { shipsDestroyed: 10, shipsLost: 10, iskDestroyed: 3, iskLost: 1 },
    isLoading: false,
    isError: false,
  });
}

function renderPage(
  characterId: number,
  esi: EsiCharacterCard | null,
  record: CharacterRecord | null,
  searchParams = "",
) {
  const Page = require("~/app/character/[characterId]/page.client").default;
  return render(
    <MantineProvider>
      <Page characterId={characterId} esi={esi} record={record} />
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

describe("character page — player", () => {
  it("renders the hero and overview from the server's ESI card", () => {
    mockClient();
    renderPage(PLAYER_ID, card, null);

    expect(
      screen.getByRole("heading", { name: "Jita Trader" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Director")).toBeInTheDocument();
    expect(screen.getByText("4.2")).toBeInTheDocument();
    expect(screen.getAllByText("16 years").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Trade Corp").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Trade Alliance").length).toBeGreaterThan(0);
    expect(screen.getByText("1,234")).toBeInTheDocument();
    // Two corporations; ten years in the current one.
    expect(screen.getByText("Since 2016-10-05")).toBeInTheDocument();
    expect(screen.getAllByText("10 years").length).toBeGreaterThan(0);
    expect(screen.getAllByText("75%").length).toBeGreaterThan(0); // ISK efficiency
    expect(screen.getByRole("tab", { name: /Biography/ })).toBeVisible();
    expect(
      screen.getByRole("tab", { name: /Employment History \(2\)/ }),
    ).toBeVisible();
    expect(screen.queryByRole("tab", { name: /Agent/ })).toBeNull();
    expect(screen.queryByText("Your character")).toBeNull();
  });

  it("prefers live ESI once it answers", () => {
    mockClient({
      live: {
        name: "Renamed",
        birthday: "2010-10-05T12:00:00Z",
        gender: "female",
        race_id: 1,
        bloodline_id: 2,
        corporation_id: 98000002,
        security_status: -2,
        achievement_score: 9,
      },
    });
    renderPage(PLAYER_ID, card, null);

    expect(
      screen.getByRole("heading", { name: "Renamed" }),
    ).toBeInTheDocument();
    // A corporation the card did not name is resolved by id; no alliance now.
    expect(
      screen.getAllByText("CorporationName:98000002").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Not in an alliance")).toBeInTheDocument();
    expect(screen.getByText("-2.0")).toBeInTheDocument();
    // Live ESI sends no title or biography: the card's old ones are gone.
    expect(screen.queryByText("Director")).toBeNull();
    expect(screen.queryByRole("tab", { name: /Biography/ })).toBeNull();
  });

  it("shows the viewer's own wallet, skill points and cards", () => {
    mockClient({ authenticated: true });
    renderPage(PLAYER_ID, card, null);

    expect(screen.getByText("Your character")).toBeInTheDocument();
    expect(screen.getByText("1234 ISK")).toBeInTheDocument();
    expect(screen.getByText(/5,000,000/)).toBeInTheDocument();
    expect(screen.getByText("Location card")).toBeInTheDocument();
  });

  it("shows the biography and the employment timeline", () => {
    mockClient();
    const { unmount } = renderPage(PLAYER_ID, card, null, "?tab=biography");
    expect(selectedTab()).toHaveTextContent("Biography");
    expect(screen.getByText("<b>Buy low</b>")).toBeInTheDocument();
    unmount();

    renderPage(PLAYER_ID, card, null, "?tab=history");
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText(/2016-10-05 → present/)).toBeInTheDocument();
    expect(
      screen.getByText(/2010-10-05 → 2016-10-05 · 6 years/),
    ).toBeInTheDocument();
  });

  it("renders without a server card, from the browser's clock", () => {
    mockClient({
      live: {
        name: "Live Only",
        birthday: "2010-10-05T12:00:00Z",
        gender: "male",
        race_id: 1,
        bloodline_id: 2,
        corporation_id: 98000001,
      },
    });
    renderPage(PLAYER_ID, null, null);
    expect(
      screen.getByRole("heading", { name: "Live Only" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Born")).toBeInTheDocument();
  });
});

describe("character page — NPC agent", () => {
  it("shows the agent and its SDE facts", () => {
    mockClient();
    mockUseCorporationHistory.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    renderPage(AGENT_ID, null, agentRecord);

    expect(
      screen.getByRole("heading", { name: "Agent Smith" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Research agent")).toBeInTheDocument();
    expect(screen.getByText("Mercs ancestry")).toBeInTheDocument();
    expect(screen.getByText("Unique")).toBeInTheDocument();
    expect(screen.getByText("CEO of")).toBeInTheDocument();
    // NPCs have no employment history or killboard.
    expect(screen.queryByRole("tab", { name: /Employment/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /Killboard/ })).toBeNull();
    expect(screen.getByRole("tab", { name: /Agent/ })).toBeVisible();
  });

  it("lists the agent's details on its tab", () => {
    mockClient();
    renderPage(AGENT_ID, null, agentRecord, "?tab=agent");
    expect(selectedTab()).toHaveTextContent("Agent");
    expect(screen.getByText("ResearchAgent")).toBeInTheDocument();
    expect(screen.getByText("2003-03-12")).toBeInTheDocument();
    expect(screen.getByText("Hidden Outpost")).toBeInTheDocument();
    expect(screen.getByText("Command Post")).toBeInTheDocument();
    const fields = screen.getByText("Research fields").closest("div");
    expect(fields).not.toBeNull();
    expect(screen.getByText("High Energy Physics")).toBeInTheDocument();
    expect(within(document.body).getByText("The Forge")).toBeInTheDocument();
  });
});

describe("character page server wrapper", () => {
  function runWrapper(id: string) {
    const Page = require("~/app/character/[characterId]/page").default;
    const tree = Page({ params: Promise.resolve({ characterId: id }) });
    expect(tree.type).toBe(Suspense);
    const child = tree.props.children;
    return (
      child.type(child.props) as Promise<{
        props: {
          children: {
            props: {
              characterId: number;
              esi: EsiCharacterCard | null;
              record: CharacterRecord | null;
            };
          };
        };
      }>
    ).then((adapter) => adapter.props.children);
  }

  const notFoundError = Object.assign(new Error("Not found"), {
    isAxiosError: true,
    response: { status: 404 },
  });

  it("hands the client page the ESI card and the database record", async () => {
    mockGetCharactersDetail.mockResolvedValue({
      data: {
        name: "Jita Trader",
        birthday: "2010-10-05T12:00:00Z",
        gender: "female",
        race_id: 1,
        bloodline_id: 2,
        corporation_id: 98000001,
        alliance_id: 99000001,
        achievement_score: 5,
      },
    });
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: {
        name: "Trade Corp",
        ticker: "T",
        description: "",
        member_count: 1,
      },
    });
    mockGetAlliancesAllianceId.mockRejectedValue(new Error("502"));
    mockLoadCharacterRecord.mockResolvedValue({ ok: true, record: null });

    const element = await runWrapper(String(PLAYER_ID));
    expect(element.props.characterId).toBe(PLAYER_ID);
    expect(element.props.esi).toMatchObject({
      name: "Jita Trader",
      corporation: { id: 98000001, name: "Trade Corp" },
      // An alliance ESI could not name stays unnamed, not a failure.
      alliance: { id: 99000001, name: null },
      achievementScore: 5,
    });
    expect(element.props.record).toBeNull();
    // The alliance's name failed: the browser fills it in, and this render
    // stays out of the cache rather than caching a nameless card.
    expect(mockConnection).toHaveBeenCalledTimes(1);
  });

  it("404s an id ESI cannot name a character with (422)", async () => {
    mockGetCharactersDetail.mockRejectedValue(
      Object.assign(new Error("Unprocessable"), {
        isAxiosError: true,
        response: { status: 422 },
      }),
    );
    mockLoadCharacterRecord.mockResolvedValue({ ok: true, record: null });
    await expect(runWrapper("2")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("404s a character neither ESI nor our database knows", async () => {
    mockGetCharactersDetail.mockRejectedValue(notFoundError);
    mockLoadCharacterRecord.mockResolvedValue({ ok: true, record: null });
    await expect(runWrapper(String(PLAYER_ID))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("renders an NPC only our database knows", async () => {
    mockGetCharactersDetail.mockRejectedValue(notFoundError);
    mockLoadCharacterRecord.mockResolvedValue({
      ok: true,
      record: agentRecord,
    });
    const element = await runWrapper(String(AGENT_ID));
    expect(element.props.esi).toBeNull();
    expect(element.props.record).toBe(agentRecord);
  });

  it("keeps renders degraded by an ESI or database failure uncached", async () => {
    mockConnection.mockResolvedValue(undefined);
    mockGetCharactersDetail.mockRejectedValue(new Error("502"));
    mockLoadCharacterRecord.mockResolvedValue({ ok: true, record: null });
    const esiDown = await runWrapper(String(PLAYER_ID));
    expect(esiDown.props.esi).toBeNull();
    expect(mockConnection).toHaveBeenCalledTimes(1);

    mockGetCharactersDetail.mockRejectedValue(notFoundError);
    mockLoadCharacterRecord.mockResolvedValue({ ok: false });
    // ESI says no such character, but the database could not answer: not a
    // 404, since the database might know it.
    const dbDown = await runWrapper(String(AGENT_ID));
    expect(dbDown.props.record).toBeNull();
    expect(mockConnection).toHaveBeenCalledTimes(2);
  });

  it("lists only a placeholder id the page 404s without a query", async () => {
    const { generateStaticParams } =
      require("~/app/character/[characterId]/page") as typeof PageModule;
    const params = generateStaticParams();
    expect(params).toEqual([{ characterId: "0" }]);
    await expect(runWrapper(params[0]!.characterId)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mockLoadCharacterRecord).not.toHaveBeenCalled();
  });

  it("describes the character and its affiliations on the card", async () => {
    mockGetCharactersDetail.mockResolvedValue({
      data: {
        name: "Jita Trader",
        birthday: "2010-10-05T12:00:00Z",
        gender: "female",
        race_id: 1,
        bloodline_id: 2,
        corporation_id: 98000001,
        achievement_score: 0,
      },
    });
    mockGetCorporationsCorporationId.mockResolvedValue({
      data: {
        name: "Trade Corp",
        ticker: "T",
        description: "",
        member_count: 1,
      },
    });
    const { generateMetadata } =
      require("~/app/character/[characterId]/page") as typeof PageModule;
    const metadata = await generateMetadata({
      params: Promise.resolve({ characterId: String(PLAYER_ID) }),
    });
    expect(metadata.title).toBe("Jita Trader");
    expect(metadata.alternates?.canonical).toBe(`/character/${PLAYER_ID}`);
    expect(metadata.description).toContain("flying with Trade Corp");
  });
});
