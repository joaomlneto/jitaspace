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
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import type * as KillmailsModule from "~/components/Killmails";
import type { EsiKillmail } from "~/components/Killmails";

// ---------------------------------------------------------------------------
// The three killmail cards — Line, Tile and Feed — render a killmail already
// in hand; EsiKillmailCard fetches one from ESI first. Names, avatars and
// anchors are the shared stubs.
// ---------------------------------------------------------------------------

const mockUseKillmail = jest.fn();
const mockUseSolarSystem = jest.fn();
const mockUseConstellation = jest.fn();
const mockUseEsiName = jest.fn();
jest.mock("@jitaspace/hooks", () => ({
  useKillmail: (...args: unknown[]) => mockUseKillmail(...args),
  useSolarSystem: (...args: unknown[]) => mockUseSolarSystem(...args),
  useConstellation: (...args: unknown[]) => mockUseConstellation(...args),
  useEsiName: (...args: unknown[]) => mockUseEsiName(...args),
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@jitaspace/ui", () => ({
  ...jest.requireActual<Record<string, unknown>>("@jitaspace/ui"),
  SolarSystemSecurityStatusBadge: ({
    securityStatus,
  }: {
    securityStatus?: number;
  }) => <span data-testid="security">{securityStatus ?? "?"}</span>,
  TimeAgoText: ({ date }: { date: Date }) => (
    <span data-testid="time-ago">{date.toISOString()}</span>
  ),
}));

jest.mock("@jitaspace/eve-icons", () => ({ FittingIcon: () => null }));

const mockOpenContextModal = jest.fn();
jest.mock("@mantine/modals", () => ({
  openContextModal: (...args: unknown[]) => mockOpenContextModal(...args),
}));

jest.mock("~/components/Link", () => ({
  HoverPrefetchLink: ({
    href,
    children,
    prefetch: _prefetch,
    ...props
  }: {
    href: string;
    children?: ReactNode;
    prefetch?: boolean;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const KILLMAIL: EsiKillmail = {
  killmail_id: 139116685,
  killmail_time: "2026-10-12T18:38:34Z",
  solar_system_id: 30000142,
  victim: {
    character_id: 2116159360,
    corporation_id: 98438878,
    alliance_id: 99003581,
    damage_taken: 460,
    ship_type_id: 670,
  },
  attackers: [
    {
      character_id: 2124119042,
      corporation_id: 98651050,
      damage_done: 222,
      final_blow: false,
      security_status: 2.7,
      ship_type_id: 34562,
    },
    {
      character_id: 2114364765,
      corporation_id: 98650104,
      damage_done: 238,
      final_blow: true,
      security_status: -1.9,
      ship_type_id: 34562,
    },
    {
      character_id: 2123449690,
      corporation_id: 98650104,
      damage_done: 0,
      final_blow: false,
      security_status: 2.2,
    },
  ],
};
const HASH = "d09a367c5af6d3ce1ca0acfbc78fd6a4c6382165";

function renderWithMantine(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

function load() {
  return require("~/components/Killmails") as typeof KillmailsModule;
}

const TAG = { label: "Aggressor loss", color: "#d1795c" };
const DETAILS = `/kill/139116685?hash=${HASH}`;

beforeEach(() => {
  mockUseSolarSystem.mockReturnValue({
    data: { data: { security_status: 0.95, constellation_id: 20000020 } },
  });
  mockUseConstellation.mockReturnValue({
    data: { data: { region_id: 10000002 } },
  });
  mockUseEsiName.mockReturnValue({ name: "Capsule", loading: false });
});

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

/** Opens a card's "Open in…" menu and returns where its items lead. */
async function openInMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Open in…" }));
  const items = await screen.findAllByRole("menuitem");
  return items.map((item) => [item.textContent, item.getAttribute("href")]);
}

describe("KillmailLineCard", () => {
  it("shows the kill on one line, with fitting and an Open-in menu", async () => {
    const { KillmailLineCard } = load();
    renderWithMantine(
      <KillmailLineCard
        killmail={KILLMAIL}
        hash={HASH}
        zkb={{ hash: HASH, totalValue: 12_500_000_000 }}
        tag={TAG}
      />,
    );

    const line = screen.getByRole("article", { name: "Killmail 139116685" });
    expect(line).toHaveStyle({ "--killmail-accent": "#d1795c" });

    // The EVE time, and the ship's name opening our killmail page.
    expect(screen.getByText("18:38")).toBeInTheDocument();
    expect(screen.getByText("Oct 12")).toBeInTheDocument();
    expect(screen.getByText("type-670").closest("a")).toHaveAttribute(
      "href",
      DETAILS,
    );
    expect(screen.getByText("Aggressor loss")).toBeInTheDocument();

    // The victim and their corporation, then the flagged final blow.
    expect(screen.getByText("char-2116159360").closest("a")).toHaveAttribute(
      "href",
      "/character/2116159360",
    );
    expect(screen.getByText("char-2114364765")).toBeInTheDocument();
    expect(screen.queryByText("char-2124119042")).not.toBeInTheDocument();
    expect(screen.getByText("+2 others")).toBeInTheDocument();

    // The system without its region, which this card has no room for.
    expect(screen.getByTestId("security")).toHaveTextContent("0.95");
    expect(mockUseConstellation).toHaveBeenCalledWith(undefined);

    expect(screen.getByTestId("isk-amount").parentElement).toHaveAttribute(
      "data-tier",
      "huge",
    );

    fireEvent.click(screen.getByRole("button", { name: "Show fitting" }));
    expect(mockOpenContextModal).toHaveBeenCalledWith(
      expect.objectContaining({
        modal: "killmailFitting",
        innerProps: { killmailId: 139116685, killmailHash: HASH },
      }),
    );

    await expect(openInMenu()).resolves.toEqual([
      ["zKillboard", "https://zkillboard.com/kill/139116685/"],
      ["EVE-Kill", "https://eve-kill.com/kill/139116685"],
    ]);
  });

  it("titles its columns and shows a skeleton while loading", () => {
    const { KillmailLineCardHeader, KillmailLineCardSkeleton } = load();
    const { container } = renderWithMantine(
      <>
        <KillmailLineCardHeader />
        <KillmailLineCardSkeleton />
      </>,
    );
    for (const title of ["Ship", "Victim", "Final blow", "System", "Value"])
      expect(screen.getByText(title)).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("copes with a kill nobody is credited with", () => {
    const { KillmailLineCard } = load();
    renderWithMantine(
      <KillmailLineCard
        killmail={{
          ...KILLMAIL,
          victim: { damage_taken: 0, ship_type_id: 670 },
          attackers: [],
        }}
        hash={HASH}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("Solo")).toBeInTheDocument();
    expect(screen.getByRole("article")).not.toHaveAttribute("style");
  });
});

describe("KillmailTileCard", () => {
  it("shows the ship, value, victim, final blow, where and when", async () => {
    const { KillmailTileCard } = load();
    renderWithMantine(
      <KillmailTileCard
        killmail={KILLMAIL}
        hash={HASH}
        zkb={{ hash: HASH, totalValue: 2_000_000_000 }}
        tag={TAG}
      />,
    );

    expect(screen.getByTestId("type-anchor")).toHaveAttribute(
      "href",
      "/type/670",
    );
    expect(screen.getByText("Aggressor loss")).toBeInTheDocument();
    expect(screen.getByTestId("isk-amount").parentElement).toHaveAttribute(
      "data-tier",
      "high",
    );
    expect(screen.getByText("char-2116159360")).toBeInTheDocument();
    expect(screen.getByText("char-2114364765")).toBeInTheDocument();
    expect(screen.getByText("+2 others")).toBeInTheDocument();
    expect(screen.getByTestId("time-ago").closest("a")).toHaveAttribute(
      "href",
      DETAILS,
    );
    await expect(openInMenu()).resolves.toHaveLength(2);
  });

  it("names a structure's owner, and says when nobody shot it", () => {
    const { KillmailTileCard, KillmailTileCardSkeleton } = load();
    const { container } = renderWithMantine(
      <>
        <KillmailTileCard
          killmail={{
            ...KILLMAIL,
            victim: {
              corporation_id: 98438878,
              alliance_id: 99003581,
              damage_taken: 1,
              ship_type_id: 35832,
            },
            attackers: [],
          }}
          hash={HASH}
        />
        <KillmailTileCardSkeleton />
      </>,
    );
    // The corporation is the name, so it is not repeated below it.
    expect(screen.getAllByTestId("corp-anchor")).toHaveLength(1);
    expect(
      document.querySelector('a[href="/alliance/99003581"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("No attackers")).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});

describe("KillmailFeedCard", () => {
  function renderFeed(
    killmail: EsiKillmail = KILLMAIL,
    zkb: KillmailsModule.ZkbKillmailMeta = {
      hash: HASH,
      totalValue: 10_000,
      solo: true,
      awox: true,
    },
  ) {
    const { KillmailFeedCard } = load();
    return renderWithMantine(
      <KillmailFeedCard killmail={killmail} hash={HASH} zkb={zkb} tag={TAG} />,
    );
  }

  it("tells the kill as a sentence", () => {
    renderFeed();
    const entry = screen.getByRole("article");
    expect(entry).toHaveTextContent(
      "char-2116159360 (corp-98438878) lost a type-670 to char-2114364765 and 2 others",
    );
    expect(mockUseEsiName).toHaveBeenCalledWith(670, "inventory_type");
    for (const badge of ["Aggressor loss", "Solo", "Awox"])
      expect(screen.getByText(badge)).toBeInTheDocument();
    expect(mockUseConstellation).toHaveBeenCalledWith(20000020);
  });

  it("says “an” before a ship whose name starts with a vowel", () => {
    mockUseEsiName.mockReturnValue({ name: "Amarr Shuttle", loading: false });
    renderFeed({ ...KILLMAIL, attackers: KILLMAIL.attackers.slice(1, 2) });
    const entry = screen.getByRole("article");
    expect(entry).toHaveTextContent("lost an type-670 to char-2114364765");
    expect(entry).not.toHaveTextContent("other");
  });

  it("offers just the fitting and an Open-in menu", async () => {
    renderFeed();
    expect(
      screen.getByRole("button", { name: "Show fitting" }),
    ).toBeInTheDocument();
    await expect(openInMenu()).resolves.toEqual([
      ["zKillboard", "https://zkillboard.com/kill/139116685/"],
      ["EVE-Kill", "https://eve-kill.com/kill/139116685"],
    ]);
  });

  it("opens our killmail page when the entry itself is clicked", () => {
    renderFeed();
    fireEvent.click(screen.getByText("18:38"));
    expect(mockPush).toHaveBeenCalledWith(DETAILS);
  });

  it("leaves clicks on its own links and buttons alone", () => {
    renderFeed();
    fireEvent.click(screen.getByText("char-2116159360"));
    fireEvent.click(screen.getByRole("button", { name: "Show fitting" }));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("opens a new tab on a modified click, and nothing after a selection", () => {
    const open = jest.spyOn(window, "open").mockReturnValue(null);
    renderFeed();
    fireEvent.click(screen.getByText("18:38"), { metaKey: true });
    expect(open).toHaveBeenCalledWith(DETAILS, "_blank", "noopener");

    const selection = jest
      .spyOn(window, "getSelection")
      .mockReturnValue({ toString: () => "Jita" } as Selection);
    fireEvent.click(screen.getByText("18:38"));
    expect(mockPush).not.toHaveBeenCalled();
    selection.mockRestore();
    open.mockRestore();
  });

  it("shows a skeleton while loading", () => {
    const { KillmailFeedCardSkeleton } = load();
    const { container } = renderWithMantine(<KillmailFeedCardSkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});

describe("EsiKillmailCard", () => {
  function renderEsi(
    props: Partial<KillmailsModule.EsiKillmailCardProps> = {},
  ) {
    const { EsiKillmailCard, KillmailLineCard } = load();
    return renderWithMantine(
      <EsiKillmailCard
        killmailId={KILLMAIL.killmail_id}
        killmailHash={HASH}
        card={KillmailLineCard}
        skeleton={<div data-testid="skeleton" />}
        {...props}
      />,
    );
  }

  it("shows the given skeleton while ESI answers", () => {
    mockUseKillmail.mockReturnValue({ data: undefined, isError: false });
    renderEsi();
    expect(mockUseKillmail).toHaveBeenCalledWith(HASH, KILLMAIL.killmail_id);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("points to zKillboard when ESI fails", () => {
    mockUseKillmail.mockReturnValue({ data: undefined, isError: true });
    renderEsi({ killmailId: 42 });
    expect(
      screen.getByText(/Killmail #42 could not be loaded/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View it on zKillboard" }),
    ).toHaveAttribute("href", "https://zkillboard.com/kill/42/");
  });

  it("renders the fetched killmail with the given card, tagged", () => {
    mockUseKillmail.mockReturnValue({ data: { data: KILLMAIL } });
    const tagFor = jest.fn((killmail: EsiKillmail) =>
      killmail.victim.alliance_id === 99003581
        ? { label: "Defender loss", color: "#5f9cba" }
        : undefined,
    );
    renderEsi({ tagFor });
    expect(tagFor).toHaveBeenCalledWith(KILLMAIL);
    expect(screen.getByText("Defender loss")).toBeInTheDocument();
    expect(screen.getByText("type-670").closest("a")).toHaveAttribute(
      "href",
      DETAILS,
    );
  });
});
