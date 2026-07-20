import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// --- Hook mocks ---------------------------------------------------------------
const mockUseEsiAllianceInformation = jest.fn();
const mockUseCalendarEvent = jest.fn();
const mockUseCorporation = jest.fn();
const mockUseCharacterMailLabels = jest.fn();
const mockUseSolarSystem = jest.fn();
const mockUseWar = jest.fn();
const mockUseStargate = jest.fn();
const mockUseAccessToken = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useEsiAllianceInformation: (allianceId: number) =>
    mockUseEsiAllianceInformation(allianceId),
  useCalendarEvent: (characterId?: number, eventId?: number) =>
    mockUseCalendarEvent(characterId, eventId),
  useCorporation: (corporationId: number) => mockUseCorporation(corporationId),
  useCharacterMailLabels: (characterId: number) =>
    mockUseCharacterMailLabels(characterId),
  useSolarSystem: (solarSystemId: number) => mockUseSolarSystem(solarSystemId),
  useWar: (warId: number) => mockUseWar(warId),
  useStargate: (stargateId: number) => mockUseStargate(stargateId),
  useAccessToken: (args: unknown) => mockUseAccessToken(args),
}));

// --- esi-client mock (used by OpenInformationWindowAnchor) --------------------
const mockPostUiOpenwindowInformation =
  jest.fn<(...args: unknown[]) => Promise<void>>();

jest.mock("@jitaspace/esi-client", () => ({
  postUiOpenwindowInformation: (...args: unknown[]) =>
    mockPostUiOpenwindowInformation(...args),
}));

// --- UI passthrough stubs -----------------------------------------------------
jest.mock("@jitaspace/ui", () => ({
  // Badges: render the single data field they receive.
  AllianceTickerBadge: ({ ticker }: { ticker?: string }) => (
    <span data-testid="ui-alliance-ticker">{ticker ?? "no-ticker"}</span>
  ),
  CorporationTickerBadge: ({ ticker }: { ticker?: string }) => (
    <span data-testid="ui-corporation-ticker">{ticker ?? "no-ticker"}</span>
  ),
  CalendarEventResponseBadge: ({ response }: { response?: string }) => (
    <span data-testid="ui-event-response">{response ?? "no-response"}</span>
  ),
  MailLabelBadge: ({ labelName }: { labelName?: string }) => (
    <span data-testid="ui-mail-label">{labelName ?? "no-label"}</span>
  ),
  SolarSystemSecurityStatusBadge: ({
    securityStatus,
  }: {
    securityStatus?: number;
  }) => (
    <span data-testid="ui-security-status">
      {securityStatus === undefined ? "no-sec" : String(securityStatus)}
    </span>
  ),
  // Anchors: expose the props they receive via data attributes / children.
  OpenInformationWindowAnchor: ({
    onOpen,
    disabled,
    children,
  }: {
    onOpen?: () => void;
    disabled?: boolean;
    children?: ReactNode;
  }) => (
    <button
      type="button"
      data-testid="ui-open-info-anchor"
      data-disabled={disabled ? "true" : "false"}
      onClick={() => onOpen?.()}
    >
      {children}
    </button>
  ),
}));

// Anchors that moved to @jitaspace/eve-components are stubbed there so the
// wrappers (which import them from that package) pick up these stubs.
jest.mock("@jitaspace/eve-components", () => ({
  CalendarEventOwnerAnchor: ({
    ownerId,
    ownerType,
    children,
  }: {
    ownerId?: number;
    ownerType?: string;
    children?: ReactNode;
  }) => (
    <a
      data-testid="ui-event-owner-anchor"
      data-owner-id={ownerId ?? ""}
      data-owner-type={ownerType ?? ""}
    >
      {children}
    </a>
  ),
  StargateDestinationAnchor: ({
    destinationSystemId,
    children,
  }: {
    destinationSystemId?: number;
    children?: ReactNode;
  }) => (
    <a
      data-testid="ui-stargate-anchor"
      data-destination-system-id={destinationSystemId ?? ""}
    >
      {children}
    </a>
  ),
  WarAggressorAnchor: ({
    aggressorAllianceId,
    aggressorCorporationId,
    children,
  }: {
    aggressorAllianceId?: number;
    aggressorCorporationId?: number;
    children?: ReactNode;
  }) => (
    <a
      data-testid="ui-war-aggressor-anchor"
      data-alliance-id={aggressorAllianceId ?? ""}
      data-corporation-id={aggressorCorporationId ?? ""}
    >
      {children}
    </a>
  ),
  WarDefenderAnchor: ({
    defenderAllianceId,
    defenderCorporationId,
    children,
  }: {
    defenderAllianceId?: number;
    defenderCorporationId?: number;
    children?: ReactNode;
  }) => (
    <a
      data-testid="ui-war-defender-anchor"
      data-alliance-id={defenderAllianceId ?? ""}
      data-corporation-id={defenderCorporationId ?? ""}
    >
      {children}
    </a>
  ),
}));

// Components are pulled in lazily (after the mocks above are registered) to keep
// the barrels' transitive imports from loading the real hooks/ui modules.
type BadgeBarrel = typeof import("~/components/Badge");
type AnchorBarrel = typeof import("~/components/Anchor");

const badges = (): BadgeBarrel => require("~/components/Badge");
const anchors = (): AnchorBarrel => require("~/components/Anchor");

function renderWithMantine(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

beforeEach(() => {
  mockUseEsiAllianceInformation.mockReset();
  mockUseCalendarEvent.mockReset();
  mockUseCorporation.mockReset();
  mockUseCharacterMailLabels.mockReset();
  mockUseSolarSystem.mockReset();
  mockUseWar.mockReset();
  mockUseStargate.mockReset();
  mockUseAccessToken.mockReset();
  mockPostUiOpenwindowInformation.mockReset();

  // Sensible defaults so wrappers not under test (delegated children) don't blow up.
  mockUseEsiAllianceInformation.mockReturnValue({ data: undefined });
  mockUseCorporation.mockReturnValue({ data: undefined });
});

// =============================================================================
// Badges
// =============================================================================
describe("AllianceTickerBadge (wrapper)", () => {
  it("passes the alliance ticker from the hook to the UI badge", () => {
    mockUseEsiAllianceInformation.mockReturnValue({
      data: { data: { ticker: "TEST" } },
    });
    const { AllianceTickerBadge } = badges();

    renderWithMantine(<AllianceTickerBadge allianceId={99005338} />);

    expect(mockUseEsiAllianceInformation).toHaveBeenCalledWith(99005338);
    expect(screen.getByTestId("ui-alliance-ticker")).toHaveTextContent("TEST");
  });

  it("defaults the alliance id to 0 when none is provided", () => {
    mockUseEsiAllianceInformation.mockReturnValue({
      data: { data: { ticker: "ZERO" } },
    });
    const { AllianceTickerBadge } = badges();

    renderWithMantine(<AllianceTickerBadge />);

    expect(mockUseEsiAllianceInformation).toHaveBeenCalledWith(0);
    expect(screen.getByTestId("ui-alliance-ticker")).toHaveTextContent("ZERO");
  });
});

describe("CorporationTickerBadge (wrapper)", () => {
  it("passes the corporation ticker from the hook to the UI badge", () => {
    mockUseCorporation.mockReturnValue({
      data: { data: { ticker: "E-UNI" } },
    });
    const { CorporationTickerBadge } = badges();

    renderWithMantine(<CorporationTickerBadge corporationId={98553333} />);

    expect(mockUseCorporation).toHaveBeenCalledWith(98553333);
    expect(screen.getByTestId("ui-corporation-ticker")).toHaveTextContent(
      "E-UNI",
    );
  });

  it("defaults the corporation id to 0 when none is provided", () => {
    mockUseCorporation.mockReturnValue({
      data: { data: { ticker: "NOID" } },
    });
    const { CorporationTickerBadge } = badges();

    renderWithMantine(<CorporationTickerBadge />);

    expect(mockUseCorporation).toHaveBeenCalledWith(0);
    expect(screen.getByTestId("ui-corporation-ticker")).toHaveTextContent(
      "NOID",
    );
  });
});

describe("CalendarEventResponseBadge (wrapper)", () => {
  it("passes the event response from the hook to the UI badge", () => {
    mockUseCalendarEvent.mockReturnValue({
      data: { data: { response: "accepted" } },
    });
    const { CalendarEventResponseBadge } = badges();

    renderWithMantine(
      <CalendarEventResponseBadge characterId={123} eventId={456} />,
    );

    expect(mockUseCalendarEvent).toHaveBeenCalledWith(123, 456);
    expect(screen.getByTestId("ui-event-response")).toHaveTextContent(
      "accepted",
    );
  });

  it("renders without a response when the hook has no data", () => {
    mockUseCalendarEvent.mockReturnValue({ data: undefined });
    const { CalendarEventResponseBadge } = badges();

    renderWithMantine(<CalendarEventResponseBadge />);

    expect(screen.getByTestId("ui-event-response")).toHaveTextContent(
      "no-response",
    );
  });

  it("uses a provided response directly and skips the per-event fetch", () => {
    mockUseCalendarEvent.mockReturnValue({ data: undefined });
    const { CalendarEventResponseBadge } = badges();

    renderWithMantine(
      <CalendarEventResponseBadge characterId={123} response="declined" />,
    );

    // The response is already known (from the summary feed), so no event id is
    // passed to the detail hook — its query stays disabled.
    expect(mockUseCalendarEvent).toHaveBeenCalledWith(123, undefined);
    expect(screen.getByTestId("ui-event-response")).toHaveTextContent(
      "declined",
    );
  });
});

describe("MailLabelBadge (wrapper)", () => {
  it("finds the matching label by id and passes its name to the UI badge", () => {
    mockUseCharacterMailLabels.mockReturnValue({
      data: {
        data: {
          labels: [
            { label_id: 1, name: "Inbox" },
            { label_id: 2, name: "Corp" },
          ],
        },
      },
    });
    const { MailLabelBadge } = badges();

    renderWithMantine(<MailLabelBadge characterId={123} labelId={2} />);

    expect(mockUseCharacterMailLabels).toHaveBeenCalledWith(123);
    expect(screen.getByTestId("ui-mail-label")).toHaveTextContent("Corp");
  });

  it("passes no label name when the id is not found", () => {
    mockUseCharacterMailLabels.mockReturnValue({
      data: { data: { labels: [{ label_id: 1, name: "Inbox" }] } },
    });
    const { MailLabelBadge } = badges();

    renderWithMantine(<MailLabelBadge characterId={123} labelId={999} />);

    expect(screen.getByTestId("ui-mail-label")).toHaveTextContent("no-label");
  });

  it("defaults the character id to 0 and handles missing labels list", () => {
    mockUseCharacterMailLabels.mockReturnValue({ data: { data: {} } });
    const { MailLabelBadge } = badges();

    renderWithMantine(<MailLabelBadge labelId={1} />);

    expect(mockUseCharacterMailLabels).toHaveBeenCalledWith(0);
    expect(screen.getByTestId("ui-mail-label")).toHaveTextContent("no-label");
  });
});

describe("SolarSystemSecurityStatusBadge (wrapper)", () => {
  it("passes the security status from the hook to the UI badge", () => {
    mockUseSolarSystem.mockReturnValue({
      data: { data: { security_status: 0.9 } },
    });
    const { SolarSystemSecurityStatusBadge } = badges();

    renderWithMantine(
      <SolarSystemSecurityStatusBadge solarSystemId={30000142} />,
    );

    expect(mockUseSolarSystem).toHaveBeenCalledWith(30000142);
    expect(screen.getByTestId("ui-security-status")).toHaveTextContent("0.9");
  });

  it("defaults the solar system id to 0 when none is provided", () => {
    mockUseSolarSystem.mockReturnValue({ data: undefined });
    const { SolarSystemSecurityStatusBadge } = badges();

    renderWithMantine(<SolarSystemSecurityStatusBadge />);

    expect(mockUseSolarSystem).toHaveBeenCalledWith(0);
    expect(screen.getByTestId("ui-security-status")).toHaveTextContent(
      "no-sec",
    );
  });
});

describe("WarAggressorTickerBadge (wrapper)", () => {
  it("renders an alliance ticker badge when the aggressor is an alliance", () => {
    mockUseWar.mockReturnValue({
      data: { data: { aggressor: { alliance_id: 1001 } } },
    });
    mockUseEsiAllianceInformation.mockReturnValue({
      data: { data: { ticker: "AGGR" } },
    });
    const { WarAggressorTickerBadge } = badges();

    renderWithMantine(<WarAggressorTickerBadge warId={777} />);

    expect(mockUseWar).toHaveBeenCalledWith(777);
    expect(mockUseEsiAllianceInformation).toHaveBeenCalledWith(1001);
    expect(screen.getByTestId("ui-alliance-ticker")).toHaveTextContent("AGGR");
    expect(screen.queryByTestId("ui-corporation-ticker")).toBeNull();
  });

  it("renders a corporation ticker badge when the aggressor has no alliance", () => {
    mockUseWar.mockReturnValue({
      data: { data: { aggressor: { corporation_id: 2002 } } },
    });
    mockUseCorporation.mockReturnValue({
      data: { data: { ticker: "CORP" } },
    });
    const { WarAggressorTickerBadge } = badges();

    renderWithMantine(<WarAggressorTickerBadge warId={888} />);

    expect(mockUseCorporation).toHaveBeenCalledWith(2002);
    expect(screen.getByTestId("ui-corporation-ticker")).toHaveTextContent(
      "CORP",
    );
    expect(screen.queryByTestId("ui-alliance-ticker")).toBeNull();
  });

  it("defaults the war id to 0 when none is provided", () => {
    mockUseWar.mockReturnValue({
      data: { data: { aggressor: { corporation_id: 2002 } } },
    });
    mockUseCorporation.mockReturnValue({
      data: { data: { ticker: "CORP" } },
    });
    const { WarAggressorTickerBadge } = badges();

    renderWithMantine(<WarAggressorTickerBadge />);

    expect(mockUseWar).toHaveBeenCalledWith(0);
    expect(screen.getByTestId("ui-corporation-ticker")).toHaveTextContent(
      "CORP",
    );
  });
});

describe("WarDefenderTickerBadge (wrapper)", () => {
  it("renders an alliance ticker badge when the defender is an alliance", () => {
    mockUseWar.mockReturnValue({
      data: { data: { defender: { alliance_id: 3003 } } },
    });
    mockUseEsiAllianceInformation.mockReturnValue({
      data: { data: { ticker: "DEFA" } },
    });
    const { WarDefenderTickerBadge } = badges();

    renderWithMantine(<WarDefenderTickerBadge warId={555} />);

    expect(mockUseEsiAllianceInformation).toHaveBeenCalledWith(3003);
    expect(screen.getByTestId("ui-alliance-ticker")).toHaveTextContent("DEFA");
    expect(screen.queryByTestId("ui-corporation-ticker")).toBeNull();
  });

  it("renders a corporation ticker badge when the defender has no alliance", () => {
    mockUseWar.mockReturnValue({
      data: { data: { defender: { corporation_id: 4004 } } },
    });
    mockUseCorporation.mockReturnValue({
      data: { data: { ticker: "DEFC" } },
    });
    const { WarDefenderTickerBadge } = badges();

    renderWithMantine(<WarDefenderTickerBadge warId={666} />);

    expect(mockUseCorporation).toHaveBeenCalledWith(4004);
    expect(screen.getByTestId("ui-corporation-ticker")).toHaveTextContent(
      "DEFC",
    );
    expect(screen.queryByTestId("ui-alliance-ticker")).toBeNull();
  });

  it("defaults the war id to 0 when none is provided", () => {
    mockUseWar.mockReturnValue({
      data: { data: { defender: { corporation_id: 4004 } } },
    });
    mockUseCorporation.mockReturnValue({
      data: { data: { ticker: "DEFC" } },
    });
    const { WarDefenderTickerBadge } = badges();

    renderWithMantine(<WarDefenderTickerBadge />);

    expect(mockUseWar).toHaveBeenCalledWith(0);
    expect(screen.getByTestId("ui-corporation-ticker")).toHaveTextContent(
      "DEFC",
    );
  });
});

// =============================================================================
// Anchors
// =============================================================================
describe("CalendarEventOwnerAnchor (wrapper)", () => {
  it("passes owner id and type from the hook to the UI anchor", () => {
    mockUseCalendarEvent.mockReturnValue({
      data: { data: { owner_id: 91541581, owner_type: "character" } },
    });
    const { CalendarEventOwnerAnchor } = anchors();

    renderWithMantine(
      <CalendarEventOwnerAnchor characterId={123} eventId={456} />,
    );

    expect(mockUseCalendarEvent).toHaveBeenCalledWith(123, 456);
    const anchor = screen.getByTestId("ui-event-owner-anchor");
    expect(anchor).toHaveAttribute("data-owner-id", "91541581");
    expect(anchor).toHaveAttribute("data-owner-type", "character");
  });

  it("renders with empty owner data when the hook has no data", () => {
    mockUseCalendarEvent.mockReturnValue({ data: undefined });
    const { CalendarEventOwnerAnchor } = anchors();

    renderWithMantine(<CalendarEventOwnerAnchor />);

    const anchor = screen.getByTestId("ui-event-owner-anchor");
    expect(anchor).toHaveAttribute("data-owner-id", "");
    expect(anchor).toHaveAttribute("data-owner-type", "");
  });
});

describe("StargateDestinationAnchor (wrapper)", () => {
  it("passes the destination system id from the hook to the UI anchor", () => {
    mockUseStargate.mockReturnValue({
      data: { data: { destination: { system_id: 30000144 } } },
    });
    const { StargateDestinationAnchor } = anchors();

    renderWithMantine(<StargateDestinationAnchor stargateId={50000056} />);

    expect(mockUseStargate).toHaveBeenCalledWith(50000056);
    expect(screen.getByTestId("ui-stargate-anchor")).toHaveAttribute(
      "data-destination-system-id",
      "30000144",
    );
  });

  it("defaults the stargate id to 0 and handles a missing destination", () => {
    mockUseStargate.mockReturnValue({ data: { data: {} } });
    const { StargateDestinationAnchor } = anchors();

    renderWithMantine(<StargateDestinationAnchor />);

    expect(mockUseStargate).toHaveBeenCalledWith(0);
    expect(screen.getByTestId("ui-stargate-anchor")).toHaveAttribute(
      "data-destination-system-id",
      "",
    );
  });
});

describe("WarAggressorAnchor (wrapper)", () => {
  it("passes aggressor alliance and corporation ids to the UI anchor", () => {
    mockUseWar.mockReturnValue({
      data: {
        data: { aggressor: { alliance_id: 1001, corporation_id: 2002 } },
      },
    });
    const { WarAggressorAnchor } = anchors();

    renderWithMantine(<WarAggressorAnchor warId={777} />);

    expect(mockUseWar).toHaveBeenCalledWith(777);
    const anchor = screen.getByTestId("ui-war-aggressor-anchor");
    expect(anchor).toHaveAttribute("data-alliance-id", "1001");
    expect(anchor).toHaveAttribute("data-corporation-id", "2002");
  });

  it("defaults the war id to 0 when none is provided", () => {
    mockUseWar.mockReturnValue({
      data: { data: { aggressor: {} } },
    });
    const { WarAggressorAnchor } = anchors();

    renderWithMantine(<WarAggressorAnchor />);

    expect(mockUseWar).toHaveBeenCalledWith(0);
    const anchor = screen.getByTestId("ui-war-aggressor-anchor");
    expect(anchor).toHaveAttribute("data-alliance-id", "");
    expect(anchor).toHaveAttribute("data-corporation-id", "");
  });
});

describe("WarDefenderAnchor (wrapper)", () => {
  it("passes defender alliance and corporation ids to the UI anchor", () => {
    mockUseWar.mockReturnValue({
      data: {
        data: { defender: { alliance_id: 3003, corporation_id: 4004 } },
      },
    });
    const { WarDefenderAnchor } = anchors();

    renderWithMantine(<WarDefenderAnchor warId={888} />);

    expect(mockUseWar).toHaveBeenCalledWith(888);
    const anchor = screen.getByTestId("ui-war-defender-anchor");
    expect(anchor).toHaveAttribute("data-alliance-id", "3003");
    expect(anchor).toHaveAttribute("data-corporation-id", "4004");
  });

  it("defaults the war id to 0 when none is provided", () => {
    mockUseWar.mockReturnValue({
      data: { data: { defender: {} } },
    });
    const { WarDefenderAnchor } = anchors();

    renderWithMantine(<WarDefenderAnchor />);

    expect(mockUseWar).toHaveBeenCalledWith(0);
    const anchor = screen.getByTestId("ui-war-defender-anchor");
    expect(anchor).toHaveAttribute("data-alliance-id", "");
    expect(anchor).toHaveAttribute("data-corporation-id", "");
  });
});

describe("OpenInformationWindowAnchor (wrapper)", () => {
  it("is enabled when an access token and entity id are present", () => {
    mockUseAccessToken.mockReturnValue({
      accessToken: "token-abc",
      authHeaders: { Authorization: "Bearer token-abc" },
    });
    const { OpenInformationWindowAnchor } = anchors();

    renderWithMantine(
      <OpenInformationWindowAnchor entityId={587} characterId={123} />,
    );

    expect(mockUseAccessToken).toHaveBeenCalledWith({
      characterId: 123,
      scopes: ["esi-ui.open_window.v1"],
    });
    expect(screen.getByTestId("ui-open-info-anchor")).toHaveAttribute(
      "data-disabled",
      "false",
    );
  });

  it("is disabled when there is no access token", () => {
    mockUseAccessToken.mockReturnValue({
      accessToken: undefined,
      authHeaders: {},
    });
    const { OpenInformationWindowAnchor } = anchors();

    renderWithMantine(<OpenInformationWindowAnchor entityId={587} />);

    expect(screen.getByTestId("ui-open-info-anchor")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("is disabled when there is no entity id", () => {
    mockUseAccessToken.mockReturnValue({
      accessToken: "token-abc",
      authHeaders: { Authorization: "Bearer token-abc" },
    });
    const { OpenInformationWindowAnchor } = anchors();

    renderWithMantine(<OpenInformationWindowAnchor />);

    expect(screen.getByTestId("ui-open-info-anchor")).toHaveAttribute(
      "data-disabled",
      "true",
    );
  });

  it("calls postUiOpenwindowInformation with the entity id and auth headers on open", async () => {
    const authHeaders = { Authorization: "Bearer token-abc" };
    mockUseAccessToken.mockReturnValue({
      accessToken: "token-abc",
      authHeaders,
    });
    mockPostUiOpenwindowInformation.mockResolvedValue(undefined);
    const { OpenInformationWindowAnchor } = anchors();

    renderWithMantine(<OpenInformationWindowAnchor entityId={587} />);

    fireEvent.click(screen.getByTestId("ui-open-info-anchor"));

    await waitFor(() =>
      expect(mockPostUiOpenwindowInformation).toHaveBeenCalledWith(
        { target_id: 587 },
        authHeaders,
      ),
    );
  });

  it("does not call the ESI endpoint on open when there is no entity id", async () => {
    mockUseAccessToken.mockReturnValue({
      accessToken: "token-abc",
      authHeaders: { Authorization: "Bearer token-abc" },
    });
    const { OpenInformationWindowAnchor } = anchors();

    renderWithMantine(<OpenInformationWindowAnchor />);

    fireEvent.click(screen.getByTestId("ui-open-info-anchor"));

    // microtask flush
    await Promise.resolve();
    expect(mockPostUiOpenwindowInformation).not.toHaveBeenCalled();
  });
});
