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

const WAR_ID = 30000142;

const mockUseSelectedCharacter = jest.fn();
const mockUseWar = jest.fn();
const mockUseWarKillmails = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ warId: String(WAR_ID) }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useWar: (...args: unknown[]) => mockUseWar(...args),
  useWarKillmails: (...args: unknown[]) => mockUseWarKillmails(...args),
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("@jitaspace/eve-icons", () => ({
  WarReportIcon: () => null,
}));

jest.mock("~/components/ActionIcon", () => ({
  OpenInformationWindowActionIcon: () => <div data-testid="info-window" />,
}));

jest.mock("~/components/Anchor", () => ({
  WarAggressorAnchor: ({ children }: { children?: ReactNode }) => (
    <span>{children}</span>
  ),
  WarDefenderAnchor: ({ children }: { children?: ReactNode }) => (
    <span>{children}</span>
  ),
}));

jest.mock("~/components/Avatar", () => ({
  WarAggressorAvatar: () => null,
  WarDefenderAvatar: () => null,
}));

jest.mock("~/components/Badge", () => ({
  AllianceTickerBadge: () => null,
  CorporationTickerBadge: () => null,
  WarAggressorTickerBadge: () => null,
  WarDefenderTickerBadge: () => null,
}));

jest.mock("~/components/Text", () => ({
  WarAggressorName: () => <span>Aggressor Name</span>,
  WarDefenderName: () => <span>Defender Name</span>,
}));

jest.mock("~/components/Killmails", () => ({
  KillmailCard: ({ killmailId }: { killmailId: number }) => (
    <div data-testid="killmail-card">{`Killmail ${killmailId}`}</div>
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

function renderPage() {
  const Page = require("~/app/war/[warId]/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("War page", () => {
  beforeEach(() => {
    mockUseSelectedCharacter.mockReset();
    mockUseWar.mockReset();
    mockUseWarKillmails.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders a full war with all date rows, allies and killmails (every branch)", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123456789 });
    mockUseWar.mockReturnValue({
      data: {
        data: {
          aggressor: {
            corporation_id: 1000035,
            alliance_id: 99000001,
            isk_destroyed: 123456789,
            ships_killed: 42,
          },
          defender: {
            alliance_id: 99000002,
            isk_destroyed: 987654321,
            ships_killed: 7,
          },
          declared: "2020-01-01T00:00:00Z",
          started: "2020-01-02T00:00:00Z",
          retracted: "2020-01-03T00:00:00Z",
          finished: "2020-01-04T00:00:00Z",
          mutual: true,
          open_for_allies: true,
          allies: [{ alliance_id: 99000003 }, { corporation_id: 1000036 }],
        },
      },
    });
    mockUseWarKillmails.mockReturnValue({
      data: {
        data: [
          { killmail_id: 1, killmail_hash: "hash1" },
          { killmail_id: 2, killmail_hash: "hash2" },
          { killmail_id: 3, killmail_hash: "hash3" },
        ],
      },
    });

    renderPage();

    expect(mockUseWar).toHaveBeenCalledWith(WAR_ID);
    expect(mockUseWarKillmails).toHaveBeenCalledWith(WAR_ID);

    expect(screen.getByText("War Report")).toBeInTheDocument();
    expect(screen.getByText("Aggressor")).toBeInTheDocument();
    expect(screen.getByText("Defender")).toBeInTheDocument();

    // Info window renders twice (aggressor + defender) because a character is selected
    expect(screen.getAllByTestId("info-window")).toHaveLength(2);

    // External links
    expect(screen.getByRole("link", { name: /zKillboard/ })).toHaveAttribute(
      "href",
      `https://zkillboard.com/war/${WAR_ID}`,
    );
    expect(
      screen.getByRole("link", { name: /DOTLAN EveMaps/ }),
    ).toHaveAttribute("href", `https://evemaps.dotlan.net/war/${WAR_ID}`);

    // All optional date / flag rows present
    expect(screen.getByText("Declared on")).toBeInTheDocument();
    expect(screen.getByText("Started on")).toBeInTheDocument();
    expect(screen.getByText("Retracted on")).toBeInTheDocument();
    expect(screen.getByText("Finished on")).toBeInTheDocument();
    expect(screen.getByText("Mutual")).toBeInTheDocument();
    expect(screen.getByText("Open for allies")).toBeInTheDocument();
    // both Mutual and Open for allies are true -> "Yes" twice
    expect(screen.getAllByText("Yes")).toHaveLength(2);

    // Allies header reflects the count, both alliance & corporation ally branches render
    expect(screen.getByText("Allies (2)")).toBeInTheDocument();

    // Killmails header + cards
    expect(screen.getByText("Killmails (3)")).toBeInTheDocument();
    expect(screen.getAllByTestId("killmail-card")).toHaveLength(3);
    expect(screen.getByText("Killmail 1")).toBeInTheDocument();
  });

  it("mounts killmails in bounded batches and reveals more on demand", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseWar.mockReturnValue({ data: undefined });
    const killmails = Array.from({ length: 30 }, (_, index) => ({
      killmail_id: index + 1,
      killmail_hash: `hash${index + 1}`,
    }));
    mockUseWarKillmails.mockReturnValue({ data: { data: killmails } });

    renderPage();

    // Title reflects the FULL count, not the sliced window.
    expect(screen.getByText("Killmails (30)")).toBeInTheDocument();

    // Only the first batch of 25 cards is mounted initially.
    expect(screen.getAllByTestId("killmail-card")).toHaveLength(25);
    expect(screen.getByText("Killmail 25")).toBeInTheDocument();
    expect(screen.queryByText("Killmail 26")).not.toBeInTheDocument();

    // "Load more" reveals the next batch (capped at the total).
    fireEvent.click(
      screen.getByRole("button", { name: /Load more killmails/ }),
    );

    expect(screen.getAllByTestId("killmail-card")).toHaveLength(30);
    expect(screen.getByText("Killmail 30")).toBeInTheDocument();

    // Nothing left to load -> button gone.
    expect(
      screen.queryByRole("button", { name: /Load more killmails/ }),
    ).not.toBeInTheDocument();
  });

  it("renders the empty war state (no war data, no killmails)", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseWar.mockReturnValue({ data: undefined });
    mockUseWarKillmails.mockReturnValue({ data: undefined });

    renderPage();

    // Header still renders
    expect(screen.getByText("War Report")).toBeInTheDocument();
    expect(screen.getByText("Aggressor")).toBeInTheDocument();
    expect(screen.getByText("Defender")).toBeInTheDocument();

    // No selected character -> no info windows
    expect(screen.queryByTestId("info-window")).not.toBeInTheDocument();

    // No war -> date/flag rows hidden
    expect(screen.queryByText("Declared on")).not.toBeInTheDocument();
    expect(screen.queryByText("Mutual")).not.toBeInTheDocument();
    expect(screen.queryByText("Open for allies")).not.toBeInTheDocument();

    // Empty counts
    expect(screen.getByText("Allies (0)")).toBeInTheDocument();
    expect(screen.getByText("Killmails (0)")).toBeInTheDocument();
    expect(screen.queryByTestId("killmail-card")).not.toBeInTheDocument();
  });

  it("renders non-mutual, not-open war with falsey flag values", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseWar.mockReturnValue({
      data: {
        data: {
          aggressor: {
            corporation_id: 1000035,
            isk_destroyed: 0,
            ships_killed: 0,
          },
          defender: {
            corporation_id: 1000036,
            isk_destroyed: 0,
            ships_killed: 0,
          },
          declared: "2020-01-01T00:00:00Z",
          // no started / retracted / finished
          mutual: false,
          open_for_allies: false,
          allies: [],
        },
      },
    });
    mockUseWarKillmails.mockReturnValue({ data: { data: [] } });

    renderPage();

    // Declared row shows, but optional started/retracted/finished are hidden
    expect(screen.getByText("Declared on")).toBeInTheDocument();
    expect(screen.queryByText("Started on")).not.toBeInTheDocument();
    expect(screen.queryByText("Retracted on")).not.toBeInTheDocument();
    expect(screen.queryByText("Finished on")).not.toBeInTheDocument();

    // Falsey flags -> "No" twice
    expect(screen.getAllByText("No")).toHaveLength(2);

    expect(screen.getByText("Allies (0)")).toBeInTheDocument();
    expect(screen.getByText("Killmails (0)")).toBeInTheDocument();
  });

  it("renders the server wrapper (page.tsx) inside a Suspense boundary", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseWar.mockReturnValue({ data: undefined });
    mockUseWarKillmails.mockReturnValue({ data: undefined });

    const WrapperPage = require("~/app/war/[warId]/page").default;
    render(
      <MantineProvider>
        <WrapperPage />
      </MantineProvider>,
    );

    expect(screen.getByText("War Report")).toBeInTheDocument();
  });
});
