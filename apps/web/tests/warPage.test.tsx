import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
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
  within,
} from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

import type { EsiKillmail, ZkbKillmail } from "~/components/Killmails";

// ---------------------------------------------------------------------------
// /war/[warId]: a hero header and Overview / Killmails / Allies tabs. The war
// and its killmail list come from ESI; zKillboard's war feed supplies the
// killmails in full, with values, 200 to a page.
// ---------------------------------------------------------------------------

const WAR_ID = 762813;
const AGGRESSOR_ALLIANCE = 99010015;
const DEFENDER_ALLIANCE = 99003581;
const ALLY_ALLIANCE = 99000003;
const ALLY_CORPORATION = 1000036;

const mockUseSelectedCharacter = jest.fn();
const mockUseWar = jest.fn();
const mockUseWarKillmails = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ warId: String(WAR_ID) }),
  useRouter: () => ({}),
  usePathname: () => "/",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useWar: (...args: unknown[]) => mockUseWar(...args),
  useWarKillmails: (...args: unknown[]) => mockUseWarKillmails(...args),
}));

jest.mock("@jitaspace/eve-icons", () => {
  const Icon = () => null;
  return new Proxy({}, { get: () => Icon });
});

jest.mock("@jitaspace/ui", () => ({
  ...jest.requireActual<Record<string, unknown>>("@jitaspace/ui"),
  TimeAgoText: () => <span>ago</span>,
}));

jest.mock("~/components/ActionIcon", () => ({
  OpenInformationWindowActionIcon: ({ entityId }: { entityId: number }) => (
    <div data-testid="info-window">{entityId}</div>
  ),
}));

jest.mock("~/components/Badge", () => ({
  AllianceTickerBadge: () => null,
  CorporationTickerBadge: () => null,
}));

// The cards have their own test; here they only report what they were given.
jest.mock("~/components/Killmails", () => ({
  ...jest.requireActual<Record<string, unknown>>(
    "~/components/Killmails/zkillboard",
  ),
  KillmailLineCard: ({
    killmail,
    zkb,
    tag,
  }: {
    killmail: EsiKillmail;
    zkb?: { totalValue?: number };
    tag?: { label: string };
  }) => (
    <div data-testid="killmail-card">
      {`Killmail ${killmail.killmail_id}`}
      {tag && ` · ${tag.label}`}
      {zkb?.totalValue !== undefined && ` · ${zkb.totalValue} ISK`}
    </div>
  ),
  EsiKillmailCard: ({
    killmailId,
    tagFor,
  }: {
    killmailId: number;
    tagFor: (killmail: EsiKillmail) => { label: string } | undefined;
  }) => (
    <div data-testid="esi-killmail-card">
      {`ESI killmail ${killmailId}`}
      {` · ${tagFor(killmailFor(killmailId, DEFENDER_ALLIANCE))?.label}`}
    </div>
  ),
  KillmailLineCardSkeleton: () => <div data-testid="killmail-skeleton" />,
  KillmailLineCardHeader: () => <div data-testid="killmail-header" />,
}));

// zKillboard's feed through useSWRInfinite: each test says what has loaded.
interface SwrInfiniteState {
  data?: ZkbKillmail[][];
  error?: Error;
  isLoading?: boolean;
  size?: number;
}
let swrState: SwrInfiniteState = {};
const mockSetSize = jest.fn((_size: number) => Promise.resolve(undefined));
let swrGetKey: (index: number, previous: ZkbKillmail[] | null) => unknown;
let swrFetcher: (url: string) => Promise<ZkbKillmail[]>;
jest.mock("swr/infinite", () => ({
  __esModule: true,
  default: (
    getKey: typeof swrGetKey,
    fetcher: typeof swrFetcher,
  ): Record<string, unknown> => {
    swrGetKey = getKey;
    swrFetcher = fetcher;
    return {
      data: swrState.data,
      error: swrState.error,
      isLoading: swrState.isLoading ?? false,
      size: swrState.size ?? 1,
      setSize: mockSetSize,
    };
  },
}));

// ESI's later killmail pages: each test says what a page holds.
const mockEsiPage = jest.fn<(page: number) => Promise<unknown>>();
jest.mock("@jitaspace/esi-client", () => ({
  ...jest.requireActual<Record<string, unknown>>("@jitaspace/esi-client"),
  getWarsWarIdKillmailsQueryOptions: (
    warId: number,
    params: { page: number },
  ) => ({
    queryKey: ["war-killmails", warId, params.page],
    queryFn: () => mockEsiPage(params.page),
  }),
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

function killmailFor(killmailId: number, victimAllianceId?: number) {
  return {
    killmail_id: killmailId,
    killmail_time: "2026-10-12T18:38:34Z",
    solar_system_id: 30000142,
    victim: {
      alliance_id: victimAllianceId,
      damage_taken: 1,
      ship_type_id: 670,
    },
    attackers: [],
  } satisfies EsiKillmail;
}

function zkbKillmail(
  killmailId: number,
  victimAllianceId?: number,
): ZkbKillmail {
  return {
    ...killmailFor(killmailId, victimAllianceId),
    zkb: { hash: `hash${killmailId}`, totalValue: killmailId * 10 },
  };
}

const esiList = (ids: number[]) => ({
  data: {
    data: ids.map((id) => ({ killmail_id: id, killmail_hash: `hash${id}` })),
    headers: {},
  },
  isLoading: false,
});

const FULL_WAR = {
  aggressor: {
    alliance_id: AGGRESSOR_ALLIANCE,
    isk_destroyed: 300,
    ships_killed: 42,
  },
  defender: {
    alliance_id: DEFENDER_ALLIANCE,
    isk_destroyed: 100,
    ships_killed: 7,
  },
  declared: "2020-01-01T00:00:00Z",
  started: "2020-01-02T00:00:00Z",
  retracted: "2020-01-03T00:00:00Z",
  finished: "2020-01-04T00:00:00Z",
  mutual: true,
  open_for_allies: true,
  allies: [
    { alliance_id: ALLY_ALLIANCE },
    { corporation_id: ALLY_CORPORATION },
  ],
};

/** Mantine, and a fresh query cache: ESI's later pages go through it. */
function withProviders(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <MantineProvider>{ui}</MantineProvider>
    </QueryClientProvider>
  );
}

function renderPage(searchParams = "") {
  const Page = require("~/app/war/[warId]/page.client").default;
  return render(withProviders(<Page />), {
    wrapper: withNuqsTestingAdapter({ searchParams }),
  });
}

// The server wrapper resolves `params` inside the Suspense boundary, so reach
// its content component the same way React would rather than rendering the
// async function as a client component.
async function resolvePageContent(warId: string) {
  const Page = require("~/app/war/[warId]/page").default;
  const suspenseEl = Page({ params: Promise.resolve({ warId }) });
  const contentEl = suspenseEl.props.children as {
    type: (props: unknown) => Promise<ReactNode>;
    props: unknown;
  };
  return contentEl.type(contentEl.props);
}

describe("War page", () => {
  beforeEach(() => {
    mockUseSelectedCharacter.mockReset();
    mockUseWar.mockReset();
    mockUseWarKillmails.mockReset();
    mockSetSize.mockClear();
    mockEsiPage.mockReset();
    swrState = {};
    mockUseSelectedCharacter.mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it("heads the page with both sides, the war's state and its totals", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123456789 });
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    mockUseWarKillmails.mockReturnValue(esiList([]));
    swrState = { data: [[]] };

    renderPage();

    expect(mockUseWar).toHaveBeenCalledWith(WAR_ID);
    expect(mockUseWarKillmails).toHaveBeenCalledWith(WAR_ID);

    expect(screen.getByText(`War #${WAR_ID}`)).toBeInTheDocument();
    // The status badge, beside the "Finished" date and timeline step.
    expect(
      screen
        .getAllByText("Finished")
        .some((el) => el.closest(".mantine-Badge-root")),
    ).toBe(true);
    expect(screen.getByText("Mutual")).toBeInTheDocument();
    expect(screen.getByText("Open for allies")).toBeInTheDocument();

    // The page's heading names both sides; the header shows each linked,
    // aggressor first, with its role.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("vs");
    const header = screen.getByRole("banner");
    expect(
      within(header)
        .getAllByRole("link")
        .map((a) => a.getAttribute("href"))
        .filter((href) => href?.startsWith("/alliance/")),
    ).toEqual([
      `/alliance/${AGGRESSOR_ALLIANCE}`,
      `/alliance/${DEFENDER_ALLIANCE}`,
    ]);
    expect(within(header).getByText("Aggressor")).toBeInTheDocument();
    expect(within(header).getByText("Defender")).toBeInTheDocument();

    // Dates in EVE time, and the war's totals.
    expect(screen.getAllByText("2020-01-01 00:00").length).toBeGreaterThan(0);
    expect(screen.getByText("Ships destroyed")).toBeInTheDocument();
    expect(screen.getByText("49")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /zKillboard/ })).toHaveAttribute(
      "href",
      `https://zkillboard.com/war/${WAR_ID}/`,
    );
    expect(
      screen.getByRole("link", { name: /DOTLAN EveMaps/ }),
    ).toHaveAttribute("href", `https://evemaps.dotlan.net/war/${WAR_ID}`);

    // Each side's info window opens on that side, not the aggressor twice.
    expect(
      screen.getAllByTestId("info-window").map((el) => el.textContent),
    ).toEqual([String(AGGRESSOR_ALLIANCE), String(DEFENDER_ALLIANCE)]);

    // The aggressor dealt 300 of the 400 ISK destroyed.
    expect(screen.getByText("75% of ISK destroyed")).toBeInTheDocument();

    // The whole lifecycle is on the timeline.
    for (const step of ["Declared", "Fighting", "Retracted"])
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    expect(
      screen.getByText("Both sides may engage each other anywhere."),
    ).toBeInTheDocument();
    expect(screen.getByText("The war is over.")).toBeInTheDocument();

    expect(
      screen.getByRole("tab", { name: /Killmails \(0\)/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Allies \(2\)/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No ships have been destroyed in this war."),
    ).toBeInTheDocument();
  });

  it("labels an ongoing war by where it is in its lifecycle", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    mockUseWar.mockReturnValue({
      data: {
        data: {
          ...FULL_WAR,
          started: future,
          retracted: undefined,
          finished: undefined,
          mutual: false,
          open_for_allies: false,
          allies: [],
        },
      },
    });
    mockUseWarKillmails.mockReturnValue(esiList([]));

    renderPage();

    expect(screen.getByText("Starting")).toBeInTheDocument();
    expect(screen.getByText("Starts")).toBeInTheDocument();
    expect(screen.queryByText("Mutual")).not.toBeInTheDocument();
    expect(screen.queryByText("Open for allies")).not.toBeInTheDocument();
    expect(screen.getByText("The aggressor declared war.")).toBeInTheDocument();
    // No allies: no tab for them.
    expect(
      screen.queryByRole("tab", { name: /Allies/ }),
    ).not.toBeInTheDocument();
  });

  it("shows the newest five kills on the Overview, tagged by who lost them", () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    const ids = [11, 12, 13, 14, 15, 16, 17];
    mockUseWarKillmails.mockReturnValue(esiList(ids));
    swrState = {
      data: [
        [
          zkbKillmail(17, AGGRESSOR_ALLIANCE),
          zkbKillmail(16, DEFENDER_ALLIANCE),
          zkbKillmail(15, ALLY_ALLIANCE),
          zkbKillmail(14, 123),
          zkbKillmail(13),
          zkbKillmail(12),
          zkbKillmail(11),
        ],
      ],
    };

    renderPage();

    const cards = screen.getAllByTestId("killmail-card");
    expect(cards.map((card) => card.textContent)).toEqual([
      "Killmail 17 · Aggressor loss · 170 ISK",
      "Killmail 16 · Defender loss · 160 ISK",
      "Killmail 15 · Ally loss · 150 ISK",
      "Killmail 14 · 140 ISK",
      "Killmail 13 · 130 ISK",
    ]);

    fireEvent.click(
      screen.getByRole("button", { name: "See all 7 killmails" }),
    );
    expect(screen.getAllByTestId("killmail-card")).toHaveLength(7);
    expect(
      screen.getByText(/Values and full killmails from/),
    ).toBeInTheDocument();
  });

  it("reveals killmails a batch at a time, fetching zKillboard pages as needed", () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    const ids = Array.from({ length: 230 }, (_, index) => index + 1);
    mockUseWarKillmails.mockReturnValue(esiList(ids));
    // zKillboard's first page: the newest 200.
    swrState = {
      data: [
        ids
          .slice(30)
          .reverse()
          .map((id) => zkbKillmail(id)),
      ],
    };

    renderPage("?tab=killmails");

    expect(
      screen.getByRole("tab", { name: /Killmails \(230\)/ }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByTestId("killmail-card")).toHaveLength(25);
    expect(screen.getByText("Killmail 230 · 2300 ISK")).toBeInTheDocument();

    const loadMore = () =>
      fireEvent.click(
        screen.getByRole("button", { name: /Load more killmails/ }),
      );
    for (let batch = 1; batch < 8; batch++) loadMore();
    expect(screen.getAllByTestId("killmail-card")).toHaveLength(200);
    expect(mockSetSize).toHaveBeenLastCalledWith(1);

    // Past the first 200 the second page is asked for.
    loadMore();
    expect(mockSetSize).toHaveBeenLastCalledWith(2);
    expect(
      screen.getByRole("button", { name: "Load more killmails (5 remaining)" }),
    ).toBeInTheDocument();
  });

  it("waits for zKillboard, then asks ESI for the killmails it lacks", () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    mockUseWarKillmails.mockReturnValue(esiList([1, 2]));

    swrState = { isLoading: true };
    const { unmount } = renderPage("?tab=killmails");
    expect(screen.getAllByTestId("killmail-skeleton")).toHaveLength(2);
    unmount();

    // zKillboard had one of the two, and nothing further back.
    swrState = { data: [[zkbKillmail(2)]] };
    renderPage("?tab=killmails");
    expect(screen.getByText("Killmail 2 · 20 ISK")).toBeInTheDocument();
    expect(screen.getByTestId("esi-killmail-card")).toHaveTextContent(
      "ESI killmail 1 · Defender loss",
    );
  });

  it("asks ESI for a kill newer than everything zKillboard has sent", () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    // zKillboard's first page is full and its second is on its way, but
    // kill 1300 is newer than the whole first page: it cannot be coming.
    const page = Array.from({ length: 200 }, (_, i) => zkbKillmail(1299 - i));
    mockUseWarKillmails.mockReturnValue(esiList([1300, 1299]));
    swrState = { data: [page], size: 2 };

    renderPage("?tab=killmails");

    expect(screen.getByTestId("esi-killmail-card")).toHaveTextContent(
      "ESI killmail 1300",
    );
    expect(screen.queryByTestId("killmail-skeleton")).not.toBeInTheDocument();
  });

  it("waits for zKillboard when ESI fails, and says so when both have", () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    mockUseWarKillmails.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    swrState = { isLoading: true };
    const { unmount } = renderPage("?tab=killmails");
    expect(screen.getAllByTestId("killmail-skeleton")).toHaveLength(3);
    unmount();

    swrState = { error: new Error("down") };
    renderPage("?tab=killmails");
    expect(
      screen.getByText(/Neither ESI nor zKillboard answered/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No ships have been destroyed in this war."),
    ).not.toBeInTheDocument();
  });

  it("reads every page of ESI's list", async () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    mockUseWarKillmails.mockReturnValue({
      data: {
        data: [{ killmail_id: 2, killmail_hash: "hash2" }],
        headers: { "x-pages": "2" },
      },
      isLoading: false,
    });
    mockEsiPage.mockResolvedValue({
      data: [{ killmail_id: 1, killmail_hash: "hash1" }],
    });
    swrState = { data: [[zkbKillmail(2), zkbKillmail(1)]] };

    renderPage("?tab=killmails");

    expect(
      await screen.findByRole("tab", { name: /Killmails \(2\)/ }),
    ).toBeInTheDocument();
    expect(mockEsiPage).toHaveBeenCalledWith(2);
  });

  it("owns up when a later ESI page fails", async () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    mockUseWarKillmails.mockReturnValue({
      data: {
        data: [{ killmail_id: 2, killmail_hash: "hash2" }],
        headers: { "x-pages": "2" },
      },
      isLoading: false,
    });
    mockEsiPage.mockRejectedValue(new Error("down"));
    swrState = { data: [[zkbKillmail(2)]] };

    renderPage("?tab=killmails");

    await waitFor(() =>
      expect(
        screen.getByText(/ESI did not answer for every page/),
      ).toBeInTheDocument(),
    );
  });

  it("owns up when zKillboard stops answering after a page", () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    mockUseWarKillmails.mockReturnValue(esiList([1]));
    swrState = { data: [[zkbKillmail(1)]], error: new Error("down") };

    renderPage("?tab=killmails");

    expect(
      screen.getByText(/which stopped answering, so older kills/),
    ).toBeInTheDocument();
  });

  it("keeps loading zKillboard's pages when ESI's list is missing", () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    mockUseWarKillmails.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    swrState = {
      data: [Array.from({ length: 200 }, (_, i) => zkbKillmail(1000 - i))],
      size: 1,
    };

    renderPage("?tab=killmails");

    const loadMore = () =>
      fireEvent.click(
        screen.getByRole("button", { name: /Load more killmails/ }),
      );
    for (let batch = 1; batch < 8; batch++) loadMore();
    expect(screen.getAllByTestId("killmail-card")).toHaveLength(200);

    // Every loaded kill is shown, but zKillboard's page was full: ask on.
    expect(
      screen.getByRole("button", { name: "Load more killmails" }),
    ).toBeInTheDocument();
    loadMore();
    expect(mockSetSize).toHaveBeenLastCalledWith(2);
  });

  it("does not count kills before any have arrived", () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    mockUseWarKillmails.mockReturnValue({ data: undefined, isLoading: true });
    swrState = { isLoading: true };

    renderPage("?tab=killmails");

    expect(screen.getByRole("tab", { name: "Killmails" })).toBeInTheDocument();
  });

  it("does not blame zKillboard when it answered with no kills", () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    mockUseWarKillmails.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    swrState = { data: [[]] };

    renderPage("?tab=killmails");

    expect(
      screen.getByText(
        "zKillboard has no kills for this war, and ESI did not answer.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Neither ESI nor zKillboard/)).toBeNull();
  });

  it("falls back to ESI alone when zKillboard fails", () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    mockUseWarKillmails.mockReturnValue(esiList([1]));
    swrState = { error: new Error("down") };

    renderPage("?tab=killmails");

    expect(screen.getByText(/which did not answer/)).toBeInTheDocument();
    expect(screen.getByTestId("esi-killmail-card")).toBeInTheDocument();
  });

  it("lists zKillboard's killmails when ESI's list is missing", () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    mockUseWarKillmails.mockReturnValue({ data: undefined, isLoading: false });
    swrState = { data: [[zkbKillmail(5)]] };

    renderPage("?tab=killmails");

    expect(screen.getByText("Killmail 5 · 50 ISK")).toBeInTheDocument();
  });

  it("lists the defender's allies on their own tab", () => {
    mockUseWar.mockReturnValue({ data: { data: FULL_WAR } });
    mockUseWarKillmails.mockReturnValue(esiList([]));

    renderPage("?tab=allies");

    expect(screen.getByText("Alliance")).toBeInTheDocument();
    expect(screen.getByText("Corporation")).toBeInTheDocument();
    expect(
      document.querySelector(`a[href="/alliance/${ALLY_ALLIANCE}"]`),
    ).toBeInTheDocument();
    expect(
      document.querySelector(`a[href="/corporation/${ALLY_CORPORATION}"]`),
    ).toBeInTheDocument();
  });

  it("renders a skeleton header and loading cards before ESI answers", () => {
    mockUseWar.mockReturnValue({ data: undefined });
    mockUseWarKillmails.mockReturnValue({ data: undefined, isLoading: true });
    swrState = { isLoading: true };

    renderPage("?tab=allies");

    // No war yet: the Allies tab is not offered, so the Overview shows.
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByText("Finished")).not.toBeInTheDocument();
    expect(screen.queryByTestId("info-window")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("killmail-skeleton")).toHaveLength(3);
  });

  it("asks zKillboard for the next page only while the last one was full", async () => {
    mockUseWar.mockReturnValue({ data: undefined });
    mockUseWarKillmails.mockReturnValue(esiList([]));
    renderPage();

    expect(swrGetKey(0, null)).toBe(
      `https://zkillboard.com/api/warID/${WAR_ID}/page/1/`,
    );
    const full = Array.from({ length: 200 }, (_, i) => zkbKillmail(i));
    expect(swrGetKey(1, full)).toBe(
      `https://zkillboard.com/api/warID/${WAR_ID}/page/2/`,
    );
    expect(swrGetKey(2, full.slice(1))).toBeNull();

    // jsdom has no Response; the fetcher reads only these three fields.
    const reply = (body: unknown, status = 200) =>
      ({
        ok: status < 400,
        status,
        json: () => Promise.resolve(body),
      }) as Response;
    const originalFetch = global.fetch;
    const fetchMock = jest.fn<typeof fetch>();
    global.fetch = fetchMock;
    try {
      fetchMock.mockResolvedValueOnce(reply([zkbKillmail(1)]));
      await expect(swrFetcher("u")).resolves.toHaveLength(1);
      fetchMock.mockResolvedValueOnce(reply({ error: "nope" }));
      await expect(swrFetcher("u")).rejects.toThrow("sent no killmails");
      fetchMock.mockResolvedValueOnce(reply(null, 429));
      await expect(swrFetcher("u")).rejects.toThrow("answered 429");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("renders the server wrapper (page.tsx) inside a Suspense boundary", async () => {
    mockUseWar.mockReturnValue({ data: undefined });
    mockUseWarKillmails.mockReturnValue({ data: undefined });

    const tree = await resolvePageContent(String(WAR_ID));
    render(withProviders(tree), { wrapper: withNuqsTestingAdapter() });

    expect(screen.getByText(`War #${WAR_ID}`)).toBeInTheDocument();
  });
});

// Every non-canonical spelling of the id is rejected, so `/war/07777` no longer
// serves the same war report as `/war/7777` under a second URL.
describe("war page id validation", () => {
  it.each(["0", "-1", "07777", "7777.0", "Infinity", ""])(
    "404s rather than serving a second URL for %p",
    async (warId) => {
      await expect(resolvePageContent(warId)).rejects.toThrow("NEXT_NOT_FOUND");
    },
  );
});
