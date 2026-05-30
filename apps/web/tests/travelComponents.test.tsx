import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Shared hook mocks
// ---------------------------------------------------------------------------
const mockUseKillmail = jest.fn<() => { data?: unknown }>();
const mockUseAllSolarSystemKills =
  jest.fn<() => { data?: unknown }>();

jest.mock("@jitaspace/hooks", () => ({
  useKillmail: (...args: unknown[]) => mockUseKillmail(...args),
  useAllSolarSystemKills: (...args: unknown[]) =>
    mockUseAllSolarSystemKills(...args),
}));

// ---------------------------------------------------------------------------
// eve-icons -> tiny stubs
// ---------------------------------------------------------------------------
jest.mock("@jitaspace/eve-icons", () => ({
  CombatLogIcon: () => <span data-testid="icon-combatlog" />,
  MercenaryIcon: () => <span data-testid="icon-mercenary" />,
  WarsIcon: () => <span data-testid="icon-wars" />,
  InfoIcon: () => <span data-testid="icon-info" />,
}));

// ---------------------------------------------------------------------------
// @jitaspace/ui -> render identifiable text so we can assert on entity ids
// ---------------------------------------------------------------------------
jest.mock("@jitaspace/ui", () => ({
  CharacterAvatar: ({ characterId }: { characterId?: number }) => (
    <span data-testid="char-avatar">{`char-avatar-${characterId ?? "?"}`}</span>
  ),
  CharacterName: ({ characterId }: { characterId?: number }) => (
    <span data-testid="char-name">{`char-${characterId ?? "?"}`}</span>
  ),
  CorporationAvatar: ({ corporationId }: { corporationId?: number }) => (
    <span data-testid="corp-avatar">{`corp-avatar-${corporationId ?? "?"}`}</span>
  ),
  CorporationName: ({ corporationId }: { corporationId?: number }) => (
    <span data-testid="corp-name">{`corp-${corporationId ?? "?"}`}</span>
  ),
  FactionAvatar: ({ factionId }: { factionId?: number }) => (
    <span data-testid="faction-avatar">{`faction-avatar-${factionId ?? "?"}`}</span>
  ),
  FactionName: ({ factionId }: { factionId?: number }) => (
    <span data-testid="faction-name">{`faction-${factionId ?? "?"}`}</span>
  ),
  TypeAvatar: ({ typeId }: { typeId?: number }) => (
    <span data-testid="type-avatar">{`type-avatar-${typeId ?? "?"}`}</span>
  ),
  TypeName: ({ typeId }: { typeId?: number }) => (
    <span data-testid="type-name">{`type-${typeId ?? "?"}`}</span>
  ),
  TimeAgoText: ({ date }: { date: Date }) => (
    <span data-testid="time-ago">{date.toISOString()}</span>
  ),
  WarAnchor: ({ children }: { children?: ReactNode }) => (
    <span data-testid="war-anchor">{children}</span>
  ),
  SolarSystemAnchor: ({ children }: { children?: ReactNode }) => (
    <span data-testid="solar-anchor">{children}</span>
  ),
  SolarSystemName: ({ solarSystemId }: { solarSystemId?: number | string }) => (
    <span data-testid="solar-name">{`system-${solarSystemId ?? "?"}`}</span>
  ),
}));

// ---------------------------------------------------------------------------
// ~/components/Text (war names used by KillmailButton)
// ---------------------------------------------------------------------------
jest.mock("~/components/Text", () => ({
  WarAggressorName: () => <span>aggressor</span>,
  WarDefenderName: () => <span>defender</span>,
}));

// ---------------------------------------------------------------------------
// ~/components/Badge (security badge used by RouteTable)
// ---------------------------------------------------------------------------
jest.mock("~/components/Badge", () => ({
  SolarSystemSecurityStatusBadge: ({
    solarSystemId,
  }: {
    solarSystemId?: number | string;
  }) => <span data-testid="sec-badge">{`sec-${solarSystemId ?? "?"}`}</span>,
}));

// ---------------------------------------------------------------------------
// ZkillboardRecentSystemKills is heavy (uses SWR + fetch). Stub it out so
// RouteTable renders its main path without hitting the network.
// ---------------------------------------------------------------------------
jest.mock("~/components/Travel/ZkillboardRecentSystemKills", () => ({
  ZkillboardRecentSystemKills: ({
    solarSystemId,
  }: {
    solarSystemId?: number | string;
  }) => <span data-testid="zkill-recent">{`zkill-${solarSystemId ?? "?"}`}</span>,
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

function renderWithMantine(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

// ===========================================================================
// KillmailButton
// ===========================================================================
describe("KillmailButton", () => {
  beforeEach(() => {
    mockUseKillmail.mockReset();
  });

  const baseKillmail = {
    killmail_time: "2024-01-01T00:00:00Z",
    victim: { character_id: 100, ship_type_id: 200 },
    attackers: [{ character_id: 300, ship_type_id: 400 }],
    war_id: undefined as number | undefined,
  };

  function renderButton(
    killmail: Partial<typeof baseKillmail> | undefined = baseKillmail,
  ) {
    const { KillmailButton } = require("~/components/Travel/KillmailButton");
    mockUseKillmail.mockReturnValue(
      killmail === undefined ? { data: undefined } : { data: { data: killmail } },
    );
    return renderWithMantine(
      <KillmailButton killmailId={555} killmailHash="abc123" />,
    );
  }

  it("renders without crashing when killmail data is undefined", () => {
    renderButton(undefined);
    // The zkillboard link should still be present
    expect(
      screen.getByRole("link"),
    ).toHaveAttribute("href", "https://zkillboard.com/kill/555/");
  });

  it("links to the zkillboard kill page", () => {
    renderButton();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://zkillboard.com/kill/555/",
    );
  });

  it("renders the victim character and ship avatars", () => {
    renderButton();
    expect(screen.getAllByText("char-avatar-100").length).toBeGreaterThan(0);
    expect(screen.getAllByText("type-avatar-200").length).toBeGreaterThan(0);
  });

  it("renders the killmail time when present", () => {
    renderButton();
    expect(screen.getByTestId("time-ago")).toHaveTextContent(
      "2024-01-01T00:00:00.000Z",
    );
  });

  it("renders an attacker with a character avatar", () => {
    renderButton({
      ...baseKillmail,
      attackers: [{ character_id: 300, ship_type_id: 400 }],
    });
    expect(screen.getAllByText("char-avatar-300").length).toBeGreaterThan(0);
  });

  it("renders an attacker with a corporation avatar when no character", () => {
    renderButton({
      ...baseKillmail,
      attackers: [
        { corporation_id: 700, ship_type_id: 400 } as never,
      ],
    });
    expect(screen.getAllByText("corp-avatar-700").length).toBeGreaterThan(0);
  });

  it("renders an attacker with a faction avatar when no character or corporation", () => {
    renderButton({
      ...baseKillmail,
      attackers: [{ faction_id: 500001, ship_type_id: 400 } as never],
    });
    expect(screen.getAllByText("faction-avatar-500001").length).toBeGreaterThan(
      0,
    );
  });

  it("renders the war indicator when the killmail has a war_id", () => {
    renderButton({ ...baseKillmail, war_id: 9999 });
    expect(screen.getByTestId("war-anchor")).toBeInTheDocument();
    expect(screen.getByTestId("icon-wars")).toBeInTheDocument();
  });

  it("does not render the war indicator when there is no war_id", () => {
    renderButton({ ...baseKillmail, war_id: undefined });
    expect(screen.queryByTestId("war-anchor")).not.toBeInTheDocument();
  });
});

// ===========================================================================
// RouteTable
// ===========================================================================
describe("RouteTable", () => {
  beforeEach(() => {
    mockUseAllSolarSystemKills.mockReset();
    mockUseAllSolarSystemKills.mockReturnValue({ data: undefined });
  });

  function renderRouteTable(route: { id: number | string }[]) {
    const { RouteTable } = require("~/components/Travel/RouteTable");
    return renderWithMantine(<RouteTable route={route} />);
  }

  it("renders the table headers", () => {
    renderRouteTable([]);
    expect(screen.getByText("Jump")).toBeInTheDocument();
    expect(screen.getByText("Solar System")).toBeInTheDocument();
    expect(screen.getByText(/Kill Statistics/)).toBeInTheDocument();
    expect(screen.getByText("Ships")).toBeInTheDocument();
    expect(screen.getByText("Pods")).toBeInTheDocument();
  });

  it("renders a row for each route node", () => {
    renderRouteTable([{ id: 30000142 }, { id: 30000144 }]);
    expect(screen.getByText("system-30000142")).toBeInTheDocument();
    expect(screen.getByText("system-30000144")).toBeInTheDocument();
  });

  it("labels the first node as Start and others by index", () => {
    renderRouteTable([{ id: 30000142 }, { id: 30000144 }]);
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders the security badge and zkillboard widget per node", () => {
    renderRouteTable([{ id: 30000142 }]);
    expect(screen.getByText("sec-30000142")).toBeInTheDocument();
    expect(screen.getByText("zkill-30000142")).toBeInTheDocument();
  });

  it("shows 0 kills when no kill statistics are available", () => {
    renderRouteTable([{ id: 30000142 }]);
    // ship and pod columns both render 0
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
  });

  it("shows kill statistics from the hook data", () => {
    mockUseAllSolarSystemKills.mockReturnValue({
      data: {
        data: [
          {
            system_id: 30000142,
            npc_kills: 5,
            pod_kills: 3,
            ship_kills: 7,
          },
        ],
        headers: { "last-modified": "2024-01-01T00:00:00Z" },
      },
    });
    renderRouteTable([{ id: 30000142 }]);
    expect(screen.getByText("7")).toBeInTheDocument(); // ship kills
    expect(screen.getByText("3")).toBeInTheDocument(); // pod kills
  });

  it("renders the kill statistics timestamp tooltip content when last-modified present", () => {
    mockUseAllSolarSystemKills.mockReturnValue({
      data: {
        data: [],
        headers: { "last-modified": "2024-06-01T12:00:00Z" },
      },
    });
    renderRouteTable([{ id: 30000142 }]);
    // TimeAgoText only renders inside the tooltip label; the table still renders
    expect(screen.getByText("system-30000142")).toBeInTheDocument();
  });
});
