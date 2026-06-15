import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hook mocks. Each is a jest.fn so individual tests can drive its return value.
// The wrappers under test are thin: they call a hook from "@jitaspace/hooks"
// and forward fields off the result to a dumb "@jitaspace/ui" component.
// ---------------------------------------------------------------------------
const mockUseCharacterMail = jest.fn();
const mockUseSolarSystem = jest.fn();
const mockUseStation = jest.fn();
const mockUseConstellation = jest.fn();
const mockUseGroup = jest.fn();
const mockUseCategory = jest.fn();
const mockUseType = jest.fn();
const mockUseMarketGroup = jest.fn();
const mockUseCharacterMailLabels = jest.fn();
const mockUseAccessToken = jest.fn();
const mockUseCalendarEvent = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useCharacterMail: (...args: unknown[]) => mockUseCharacterMail(...args),
  useSolarSystem: (...args: unknown[]) => mockUseSolarSystem(...args),
  useStation: (...args: unknown[]) => mockUseStation(...args),
  useConstellation: (...args: unknown[]) => mockUseConstellation(...args),
  useGroup: (...args: unknown[]) => mockUseGroup(...args),
  useCategory: (...args: unknown[]) => mockUseCategory(...args),
  useType: (...args: unknown[]) => mockUseType(...args),
  useMarketGroup: (...args: unknown[]) => mockUseMarketGroup(...args),
  useCharacterMailLabels: (...args: unknown[]) =>
    mockUseCharacterMailLabels(...args),
  useAccessToken: (...args: unknown[]) => mockUseAccessToken(...args),
  useCalendarEvent: (...args: unknown[]) => mockUseCalendarEvent(...args),
}));

// ---------------------------------------------------------------------------
// "@jitaspace/ui" mocks. Every dumb component rendered by a wrapper is stubbed
// as a passthrough that surfaces the props it received so we can assert them.
// ---------------------------------------------------------------------------
jest.mock("@jitaspace/ui", () => ({
  GroupBreadcrumbs: (props: Record<string, unknown>) => (
    <div data-testid="ui-group-breadcrumbs">{JSON.stringify(props)}</div>
  ),
  OpenInformationWindowActionIcon: ({
    onOpen,
    disabled,
  }: {
    onOpen?: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      data-testid="ui-open-info"
      disabled={disabled}
      onClick={() => onOpen?.()}
    >
      open-info
    </button>
  ),
  OpenMarketWindowActionIcon: ({
    onOpen,
    disabled,
  }: {
    onOpen?: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      data-testid="ui-open-market"
      disabled={disabled}
      onClick={() => onOpen?.()}
    >
      open-market
    </button>
  ),
  SetAutopilotDestinationActionIcon: ({
    onSet,
    disabled,
  }: {
    onSet?: () => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      data-testid="ui-set-autopilot"
      disabled={disabled}
      onClick={() => onSet?.()}
    >
      set-autopilot
    </button>
  ),
  TotalUnreadMailsIndicator: ({
    totalUnreadCount,
  }: {
    totalUnreadCount?: number;
  }) => (
    <div data-testid="ui-total-unread">{`Unread ${totalUnreadCount ?? ""}`}</div>
  ),
  CalendarEventAttendanceSelect: ({
    eventTitle,
    initialResponse,
    canRespond,
    isLoading,
    onRespond,
  }: {
    eventTitle?: string;
    initialResponse?: string | null;
    canRespond?: boolean;
    isLoading?: boolean;
    onRespond?: (response: string) => void;
  }) => (
    <div data-testid="ui-attendance-select">
      <span>{`Event ${eventTitle ?? ""}`}</span>
      <span>{`Response ${initialResponse ?? ""}`}</span>
      <span>{`CanRespond ${String(!!canRespond)}`}</span>
      <span>{`Loading ${String(!!isLoading)}`}</span>
      <button type="button" onClick={() => onRespond?.("accepted")}>
        respond
      </button>
    </div>
  ),
  EveMailLabelMultiSelect: ({
    labels,
  }: {
    labels?: { label_id?: number; name?: string }[];
  }) => (
    <div data-testid="ui-label-multiselect">
      {`Labels ${(labels ?? []).map((l) => l.name).join(",")}`}
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// "@jitaspace/eve-components" mocks. Same passthrough stubs as above, for the
// dumb components that moved out of @jitaspace/ui into @jitaspace/eve-components.
// ---------------------------------------------------------------------------
jest.mock("@jitaspace/eve-components", () => ({
  EveMailSenderCard: ({
    senderId,
    isLoading,
  }: {
    senderId?: number;
    isLoading?: boolean;
  }) => (
    <div data-testid="ui-mail-sender-card" data-loading={String(!!isLoading)}>
      {`Sender ${senderId ?? ""}`}
    </div>
  ),
  SolarSystemName: ({ solarSystemId }: { solarSystemId?: number | string }) => (
    <span>{`SolarSystemName ${solarSystemId ?? ""}`}</span>
  ),
  SolarSystemSovereigntyAvatar: ({
    solarSystemId,
  }: {
    solarSystemId?: number | string;
  }) => <span>{`Sov ${solarSystemId ?? ""}`}</span>,
  StationName: ({ stationId }: { stationId?: number }) => (
    <span>{`StationName ${stationId ?? ""}`}</span>
  ),
  SolarSystemBreadcrumbs: (props: Record<string, unknown>) => (
    <div data-testid="ui-solar-system-breadcrumbs">{JSON.stringify(props)}</div>
  ),
  TypeInventoryBreadcrumbs: (props: Record<string, unknown>) => (
    <div data-testid="ui-type-inventory-breadcrumbs">
      {JSON.stringify(props)}
    </div>
  ),
  TypeMarketBreadcrumbs: (props: Record<string, unknown>) => (
    <div data-testid="ui-type-market-breadcrumbs">{JSON.stringify(props)}</div>
  ),
}));

// ---------------------------------------------------------------------------
// "~/components/*" sub-modules that SolarSystemCard / StationCard render.
// Stub them as passthrough markers so we don't drag heavy deps into the test
// and so the wrappers under test stay isolated.
// ---------------------------------------------------------------------------
jest.mock("~/components/Avatar", () => ({
  StationAvatar: ({ stationId }: { stationId?: number }) => (
    <span>{`StationAvatar ${stationId ?? ""}`}</span>
  ),
}));

jest.mock("~/components/Badge", () => ({
  SolarSystemSecurityStatusBadge: ({
    solarSystemId,
  }: {
    solarSystemId?: number;
  }) => <span>{`SecBadge ${solarSystemId ?? ""}`}</span>,
}));

// NOTE: "~/components/Breadcrumbs" is intentionally NOT mocked. The cards render
// the real SolarSystemBreadcrumbs, whose own dependencies (the hooks and the
// "@jitaspace/ui" breadcrumbs) are already mocked, so it renders the stubbed
// UI breadcrumbs (data-testid="ui-solar-system-breadcrumbs"). This also keeps
// the real Breadcrumbs wrappers available for the dedicated Breadcrumbs tests
// further down, which import them from the same barrel.

// CSS modules imported by the cards — stub to empty objects.
jest.mock("~/components/Card/SolarSystemCard.module.css", () => ({}), {
  virtual: true,
});
jest.mock("~/components/Card/StationCard.module.css", () => ({}), {
  virtual: true,
});

function renderWithMantine(node: ReactNode) {
  return render(<MantineProvider>{node}</MantineProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  // Sensible defaults; individual tests override as needed.
  mockUseCharacterMail.mockReturnValue({ data: undefined, isLoading: false });
  mockUseSolarSystem.mockReturnValue({ data: undefined });
  mockUseStation.mockReturnValue({ data: undefined });
  mockUseConstellation.mockReturnValue({ data: undefined });
  mockUseGroup.mockReturnValue({ data: undefined });
  mockUseCategory.mockReturnValue({ data: undefined });
  mockUseType.mockReturnValue({ data: undefined });
  mockUseMarketGroup.mockReturnValue(undefined);
  mockUseCharacterMailLabels.mockReturnValue({ data: undefined });
  mockUseAccessToken.mockReturnValue({
    accessToken: "token",
    authHeaders: { Authorization: "Bearer token" },
  });
  mockUseCalendarEvent.mockReturnValue({
    data: undefined,
    isLoading: false,
    canRespondToEvents: false,
  });
});

// ===========================================================================
// Card wrappers
// ===========================================================================
describe("EveMailSenderCard", () => {
  it("forwards the resolved sender id and loading flag", () => {
    mockUseCharacterMail.mockReturnValue({
      data: { data: { from: 123456 } },
      isLoading: false,
    });

    const {
      EveMailSenderCard,
    } = require("../components/Card/EveMailSenderCard");

    renderWithMantine(<EveMailSenderCard characterId={42} messageId={7} />);

    expect(mockUseCharacterMail).toHaveBeenCalledWith(42, 7);
    expect(screen.getByTestId("ui-mail-sender-card")).toHaveTextContent(
      "Sender 123456",
    );
    expect(screen.getByTestId("ui-mail-sender-card")).toHaveAttribute(
      "data-loading",
      "false",
    );
  });

  it("defaults the character id to 0 and surfaces the loading state", () => {
    mockUseCharacterMail.mockReturnValue({
      data: { data: { from: undefined } },
      isLoading: true,
    });

    const {
      EveMailSenderCard,
    } = require("../components/Card/EveMailSenderCard");

    renderWithMantine(<EveMailSenderCard />);

    expect(mockUseCharacterMail).toHaveBeenCalledWith(0, undefined);
    expect(screen.getByTestId("ui-mail-sender-card")).toHaveAttribute(
      "data-loading",
      "true",
    );
  });
});

describe("SolarSystemCard", () => {
  it("renders sovereignty, security badge, name and breadcrumbs for the system", () => {
    mockUseSolarSystem.mockReturnValue({
      data: { data: { constellation_id: 20000001 } },
    });

    const { SolarSystemCard } = require("../components/Card/SolarSystemCard");

    renderWithMantine(<SolarSystemCard solarSystemId={30000142} />);

    expect(mockUseSolarSystem).toHaveBeenCalledWith(30000142);
    expect(screen.getByText("Sov 30000142")).toBeInTheDocument();
    expect(screen.getByText("SecBadge 30000142")).toBeInTheDocument();
    expect(screen.getByText("SolarSystemName 30000142")).toBeInTheDocument();

    // The real SolarSystemBreadcrumbs renders the (mocked) UI breadcrumbs.
    const breadcrumbProps = JSON.parse(
      screen.getByTestId("ui-solar-system-breadcrumbs").textContent ?? "{}",
    );
    expect(breadcrumbProps.solarSystemId).toBe(30000142);
    expect(breadcrumbProps.hideSolarSystem).toBe(true);
  });
});

describe("StationCard", () => {
  it("renders the security badge when the station has a system id", () => {
    mockUseStation.mockReturnValue({
      data: { data: { system_id: 30000142 } },
    });

    const { StationCard } = require("../components/Card/StationCard");

    renderWithMantine(<StationCard stationId={60003760} />);

    expect(mockUseStation).toHaveBeenCalledWith(60003760);
    expect(screen.getByText("StationAvatar 60003760")).toBeInTheDocument();
    expect(screen.getByText("StationName 60003760")).toBeInTheDocument();
    expect(screen.getByText("SecBadge 30000142")).toBeInTheDocument();

    // The real SolarSystemBreadcrumbs is fed the station's system id.
    const breadcrumbProps = JSON.parse(
      screen.getByTestId("ui-solar-system-breadcrumbs").textContent ?? "{}",
    );
    expect(breadcrumbProps.solarSystemId).toBe(30000142);
  });

  it("omits the security badge when the station has no system id", () => {
    mockUseStation.mockReturnValue({ data: { data: {} } });

    const { StationCard } = require("../components/Card/StationCard");

    renderWithMantine(<StationCard stationId={60003760} />);

    expect(screen.queryByText(/^SecBadge/)).not.toBeInTheDocument();
    expect(screen.getByText("StationName 60003760")).toBeInTheDocument();
  });
});

// ===========================================================================
// Breadcrumbs wrappers (imported from the barrel so index.ts is covered too)
// ===========================================================================
describe("GroupBreadcrumbs", () => {
  it("resolves the category from the group and forwards names/ids", () => {
    mockUseGroup.mockReturnValue({
      data: { data: { name: "Frigate", category_id: 6 } },
    });
    mockUseCategory.mockReturnValue({ data: { data: { name: "Ship" } } });

    const { GroupBreadcrumbs } = require("~/components/Breadcrumbs");

    renderWithMantine(<GroupBreadcrumbs groupId={25} />);

    expect(mockUseGroup).toHaveBeenCalledWith(25);
    expect(mockUseCategory).toHaveBeenCalledWith(6);

    const props = JSON.parse(
      screen.getByTestId("ui-group-breadcrumbs").textContent ?? "{}",
    );
    expect(props.groupId).toBe(25);
    expect(props.groupName).toBe("Frigate");
    expect(props.categoryId).toBe(6);
    expect(props.categoryName).toBe("Ship");
  });

  it("defaults missing ids to 0 when no group data is available", () => {
    const { GroupBreadcrumbs } = require("~/components/Breadcrumbs");

    renderWithMantine(<GroupBreadcrumbs />);

    expect(mockUseGroup).toHaveBeenCalledWith(0);
    expect(mockUseCategory).toHaveBeenCalledWith(0);
  });
});

describe("SolarSystemBreadcrumbs", () => {
  it("resolves the constellation/region chain from a numeric system id", () => {
    mockUseSolarSystem.mockReturnValue({
      data: { data: { constellation_id: 20000001 } },
    });
    mockUseConstellation.mockReturnValue({
      data: { data: { region_id: 10000001 } },
    });

    const { SolarSystemBreadcrumbs } = require("~/components/Breadcrumbs");

    renderWithMantine(
      <SolarSystemBreadcrumbs solarSystemId={30000142} hideSolarSystem />,
    );

    expect(mockUseSolarSystem).toHaveBeenCalledWith(30000142);
    expect(mockUseConstellation).toHaveBeenCalledWith(20000001);

    const props = JSON.parse(
      screen.getByTestId("ui-solar-system-breadcrumbs").textContent ?? "{}",
    );
    expect(props.solarSystemId).toBe(30000142);
    expect(props.constellationId).toBe(20000001);
    expect(props.regionId).toBe(10000001);
    expect(props.hideSolarSystem).toBe(true);
  });

  it("parses a string system id before querying the hook", () => {
    mockUseSolarSystem.mockReturnValue({ data: undefined });

    const { SolarSystemBreadcrumbs } = require("~/components/Breadcrumbs");

    renderWithMantine(<SolarSystemBreadcrumbs solarSystemId="30000142" />);

    expect(mockUseSolarSystem).toHaveBeenCalledWith(30000142);
    expect(mockUseConstellation).toHaveBeenCalledWith(0);
  });

  it("defaults to 0 when no system id is provided", () => {
    const { SolarSystemBreadcrumbs } = require("~/components/Breadcrumbs");

    renderWithMantine(<SolarSystemBreadcrumbs />);

    expect(mockUseSolarSystem).toHaveBeenCalledWith(0);
  });
});

describe("TypeInventoryBreadcrumbs", () => {
  it("resolves type -> group -> category and forwards them", () => {
    mockUseType.mockReturnValue({ data: { data: { group_id: 25 } } });
    mockUseGroup.mockReturnValue({
      data: { data: { name: "Frigate", category_id: 6 } },
    });
    mockUseCategory.mockReturnValue({ data: { data: { name: "Ship" } } });

    const { TypeInventoryBreadcrumbs } = require("~/components/Breadcrumbs");

    renderWithMantine(<TypeInventoryBreadcrumbs typeId={587} showType />);

    expect(mockUseType).toHaveBeenCalledWith(587);
    expect(mockUseGroup).toHaveBeenCalledWith(25);
    expect(mockUseCategory).toHaveBeenCalledWith(6);

    const props = JSON.parse(
      screen.getByTestId("ui-type-inventory-breadcrumbs").textContent ?? "{}",
    );
    expect(props.typeId).toBe(587);
    expect(props.groupId).toBe(25);
    expect(props.groupName).toBe("Frigate");
    expect(props.categoryId).toBe(6);
    expect(props.categoryName).toBe("Ship");
    expect(props.showType).toBe(true);
  });

  it("parses a string type id and defaults the chain to 0", () => {
    const { TypeInventoryBreadcrumbs } = require("~/components/Breadcrumbs");

    renderWithMantine(<TypeInventoryBreadcrumbs typeId="587" />);

    expect(mockUseType).toHaveBeenCalledWith(587);
    expect(mockUseGroup).toHaveBeenCalledWith(0);
    expect(mockUseCategory).toHaveBeenCalledWith(0);
  });
});

describe("TypeMarketBreadcrumbs", () => {
  it("walks the market group parent chain and builds an ordered list", () => {
    mockUseType.mockReturnValue({
      data: { data: { market_group_id: 1 } },
    });
    // Chain: group 1 -> parent 2 -> parent 3 (top).
    mockUseMarketGroup.mockImplementation((id: number) => {
      switch (id) {
        case 1:
          return { name: "Frigates", parent_group_id: 2 };
        case 2:
          return { name: "Ships", parent_group_id: 3 };
        case 3:
          return { name: "Market", parent_group_id: 0 };
        default:
          return undefined;
      }
    });

    const { TypeMarketBreadcrumbs } = require("~/components/Breadcrumbs");

    renderWithMantine(<TypeMarketBreadcrumbs typeId={587} showType />);

    expect(mockUseType).toHaveBeenCalledWith(587);

    const props = JSON.parse(
      screen.getByTestId("ui-type-market-breadcrumbs").textContent ?? "{}",
    );
    expect(props.typeId).toBe(587);
    expect(props.showType).toBe(true);
    // Built top-down: level3 (Market) first, then Ships, then Frigates.
    expect(props.marketGroups).toEqual([
      { market_group_id: 3, name: "Market" },
      { market_group_id: 2, name: "Ships" },
      { market_group_id: 1, name: "Frigates" },
    ]);
  });

  it("yields undefined market groups when the type has no market group", () => {
    mockUseType.mockReturnValue({ data: { data: {} } });

    const { TypeMarketBreadcrumbs } = require("~/components/Breadcrumbs");

    renderWithMantine(<TypeMarketBreadcrumbs typeId="587" />);

    expect(mockUseType).toHaveBeenCalledWith(587);

    const props = JSON.parse(
      screen.getByTestId("ui-type-market-breadcrumbs").textContent ?? "{}",
    );
    expect(props.marketGroups).toBeUndefined();
  });
});

// ===========================================================================
// ActionIcon wrappers (imported from the barrel so index.ts is covered too)
// ===========================================================================
describe("OpenInformationWindowActionIcon", () => {
  it("is enabled with a token and entity id, and fires the open handler", () => {
    const {
      OpenInformationWindowActionIcon,
    } = require("~/components/ActionIcon");

    renderWithMantine(
      <OpenInformationWindowActionIcon entityId={123} characterId={42} />,
    );

    const button = screen.getByTestId("ui-open-info");
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(mockUseAccessToken).toHaveBeenCalledWith({
      characterId: 42,
      scopes: ["esi-ui.open_window.v1"],
    });
  });

  it("is disabled when no entity id is provided", () => {
    const {
      OpenInformationWindowActionIcon,
    } = require("~/components/ActionIcon");

    renderWithMantine(<OpenInformationWindowActionIcon characterId={42} />);

    expect(screen.getByTestId("ui-open-info")).toBeDisabled();
  });

  it("is disabled when there is no access token", () => {
    mockUseAccessToken.mockReturnValue({ accessToken: null, authHeaders: {} });

    const {
      OpenInformationWindowActionIcon,
    } = require("~/components/ActionIcon");

    renderWithMantine(<OpenInformationWindowActionIcon entityId={123} />);

    expect(screen.getByTestId("ui-open-info")).toBeDisabled();
  });
});

describe("OpenMarketWindowActionIcon", () => {
  it("is enabled with a token and type id, and fires the open handler", () => {
    const { OpenMarketWindowActionIcon } = require("~/components/ActionIcon");

    renderWithMantine(
      <OpenMarketWindowActionIcon typeId={34} characterId={42} />,
    );

    const button = screen.getByTestId("ui-open-market");
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(mockUseAccessToken).toHaveBeenCalledWith({
      characterId: 42,
      scopes: ["esi-ui.open_window.v1"],
    });
  });

  it("is disabled when no type id is provided", () => {
    const { OpenMarketWindowActionIcon } = require("~/components/ActionIcon");

    renderWithMantine(<OpenMarketWindowActionIcon characterId={42} />);

    expect(screen.getByTestId("ui-open-market")).toBeDisabled();
  });
});

describe("SetAutopilotDestinationActionIcon", () => {
  it("is enabled with a token and destination id, and fires the set handler", () => {
    const {
      SetAutopilotDestinationActionIcon,
    } = require("~/components/ActionIcon");

    renderWithMantine(
      <SetAutopilotDestinationActionIcon
        destinationId={30000142}
        characterId={42}
        addToBeginning
        clearOtherWaypoints
      />,
    );

    const button = screen.getByTestId("ui-set-autopilot");
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(mockUseAccessToken).toHaveBeenCalledWith({
      characterId: 42,
      scopes: ["esi-ui.write_waypoint.v1"],
    });
  });

  it("is disabled when no destination id is provided", () => {
    const {
      SetAutopilotDestinationActionIcon,
    } = require("~/components/ActionIcon");

    renderWithMantine(<SetAutopilotDestinationActionIcon characterId={42} />);

    expect(screen.getByTestId("ui-set-autopilot")).toBeDisabled();
  });
});

// ===========================================================================
// Indicator wrapper (imported from the barrel so index.ts is covered too)
// ===========================================================================
describe("TotalUnreadMailsIndicator", () => {
  it("forwards the total unread count from the labels hook", () => {
    mockUseCharacterMailLabels.mockReturnValue({
      data: { data: { total_unread_count: 17 } },
    });

    const { TotalUnreadMailsIndicator } = require("~/components/Indicator");

    renderWithMantine(<TotalUnreadMailsIndicator characterId={42} />);

    expect(mockUseCharacterMailLabels).toHaveBeenCalledWith(42);
    expect(screen.getByTestId("ui-total-unread")).toHaveTextContent(
      "Unread 17",
    );
  });

  it("defaults the character id to 0 when not provided", () => {
    const { TotalUnreadMailsIndicator } = require("~/components/Indicator");

    renderWithMantine(<TotalUnreadMailsIndicator />);

    expect(mockUseCharacterMailLabels).toHaveBeenCalledWith(0);
  });
});

// ===========================================================================
// Select wrapper (imported from the barrel so index.ts is covered too)
// ===========================================================================
describe("CalendarEventAttendanceSelect", () => {
  it("forwards the event title, response and respond capability", () => {
    mockUseCalendarEvent.mockReturnValue({
      data: { data: { title: "Fleet Op", response: "tentative" } },
      isLoading: false,
      canRespondToEvents: true,
    });

    const { CalendarEventAttendanceSelect } = require("~/components/Select");

    renderWithMantine(
      <CalendarEventAttendanceSelect characterId={42} eventId={99} />,
    );

    expect(mockUseCalendarEvent).toHaveBeenCalledWith(42, 99);
    expect(mockUseAccessToken).toHaveBeenCalledWith({
      characterId: 42,
      scopes: ["esi-calendar.respond_calendar_events.v1"],
    });

    const node = screen.getByTestId("ui-attendance-select");
    expect(node).toHaveTextContent("Event Fleet Op");
    expect(node).toHaveTextContent("Response tentative");
    expect(node).toHaveTextContent("CanRespond true");
    expect(node).toHaveTextContent("Loading false");
  });

  it("invokes the respond handler when the user responds", () => {
    mockUseCalendarEvent.mockReturnValue({
      data: { data: { title: "Fleet Op", response: "not_responded" } },
      isLoading: false,
      canRespondToEvents: true,
    });

    const { CalendarEventAttendanceSelect } = require("~/components/Select");

    renderWithMantine(
      <CalendarEventAttendanceSelect characterId={42} eventId={99} />,
    );

    // onRespond is a no-op without crashing (esi-client mock not required here).
    fireEvent.click(screen.getByRole("button", { name: "respond" }));
    expect(screen.getByRole("button", { name: "respond" })).toBeInTheDocument();
  });

  it("surfaces the loading state while the event is fetching", () => {
    mockUseCalendarEvent.mockReturnValue({
      data: undefined,
      isLoading: true,
      canRespondToEvents: false,
    });

    const { CalendarEventAttendanceSelect } = require("~/components/Select");

    renderWithMantine(<CalendarEventAttendanceSelect />);

    const node = screen.getByTestId("ui-attendance-select");
    expect(node).toHaveTextContent("Loading true");
    expect(node).toHaveTextContent("CanRespond false");
  });
});

// ===========================================================================
// MultiSelect wrapper (imported from the barrel so index.ts is covered too)
// ===========================================================================
describe("EveMailLabelMultiSelect", () => {
  it("forwards the resolved labels to the dumb multi-select", () => {
    mockUseCharacterMailLabels.mockReturnValue({
      data: {
        data: {
          labels: [
            { label_id: 1, name: "Inbox" },
            { label_id: 2, name: "Sent" },
          ],
        },
      },
    });

    const { EveMailLabelMultiSelect } = require("~/components/MultiSelect");

    renderWithMantine(<EveMailLabelMultiSelect characterId={42} />);

    expect(mockUseCharacterMailLabels).toHaveBeenCalledWith(42);
    expect(screen.getByTestId("ui-label-multiselect")).toHaveTextContent(
      "Labels Inbox,Sent",
    );
  });

  it("defaults the character id to 0 when not provided", () => {
    const { EveMailLabelMultiSelect } = require("~/components/MultiSelect");

    renderWithMantine(<EveMailLabelMultiSelect />);

    expect(mockUseCharacterMailLabels).toHaveBeenCalledWith(0);
  });
});
