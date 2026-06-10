import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------

const mockUseCalendarEvent = jest.fn();
const mockUseCalendarEventAttendees = jest.fn();
const mockUseCorporationAllianceHistory = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useCalendarEvent: (...args: unknown[]) => mockUseCalendarEvent(...args),
  useCalendarEventAttendees: (...args: unknown[]) =>
    mockUseCalendarEventAttendees(...args),
  useCorporationAllianceHistory: (...args: unknown[]) =>
    mockUseCorporationAllianceHistory(...args),
}));

const mockOpenContextModal = jest.fn();
jest.mock("@mantine/modals", () => ({
  openContextModal: (...args: unknown[]) => mockOpenContextModal(...args),
}));

// ---------------------------------------------------------------------------
// UI / icon mocks
// ---------------------------------------------------------------------------

jest.mock("@jitaspace/ui", () => ({
  DateHoverCard: ({ children }: { children?: ReactNode }) => <>{children}</>,
  CharacterAnchor: ({ children }: { children?: ReactNode }) => (
    <a href="#">{children}</a>
  ),
  CharacterAvatar: ({ characterId }: { characterId?: number }) => (
    <span>{`CharAvatar ${characterId}`}</span>
  ),
  CharacterName: ({ characterId }: { characterId?: number }) => (
    <span>{`Char ${characterId}`}</span>
  ),
  EveEntityNameAnchor: ({ entityId }: { entityId?: number }) => (
    <a href="#">{`EntityAnchor ${entityId}`}</a>
  ),
  FormattedDateText: ({ date }: { date?: Date }) => (
    <span>{date ? `Date ${date.toISOString()}` : "Date none"}</span>
  ),
  // Used by the Timeline component under test.
  CorporationAllianceHistoryTimeline: ({
    history,
  }: {
    history?: { record_id: number; alliance_id?: number }[];
  }) => (
    <div data-testid="ui-timeline">
      {(history ?? []).map((h) => (
        <div key={h.record_id} data-testid="timeline-record">
          {`record ${h.record_id} alliance ${h.alliance_id ?? "none"}`}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  WarningIcon: () => <span data-testid="warning-icon">!</span>,
}));

// ---------------------------------------------------------------------------
// Local component stubs
// ---------------------------------------------------------------------------

jest.mock("~/components/Avatar", () => ({
  CalendarEventOwnerAvatar: ({ eventId }: { eventId?: number }) => (
    <span>{`OwnerAvatar ${eventId}`}</span>
  ),
}));

jest.mock("~/components/Anchor", () => ({
  CalendarEventOwnerAnchor: ({ children }: { children?: ReactNode }) => (
    <a href="#">{children}</a>
  ),
}));

jest.mock("~/components/AvatarGroup", () => ({
  CalendarEventAttendeesAvatarGroup: ({ eventId }: { eventId?: number }) => (
    <span>{`Attendees ${eventId}`}</span>
  ),
}));

jest.mock("~/components/Badge", () => ({
  CalendarEventResponseBadge: ({ eventId }: { eventId?: number }) => (
    <span>{`ResponseBadge ${eventId}`}</span>
  ),
}));

jest.mock("~/components/DurationText", () => ({
  CalendarEventHumanDurationText: ({ eventId }: { eventId?: number }) => (
    <span>{`Duration ${eventId}`}</span>
  ),
}));

jest.mock("~/components/Text", () => ({
  CalendarEventOwnerName: ({ eventId }: { eventId?: number }) => (
    <span>{`OwnerName ${eventId}`}</span>
  ),
}));

jest.mock("~/components/Select", () => ({
  CalendarEventAttendanceSelect: ({ eventId }: { eventId?: number }) => (
    <span data-testid="attendance-select">{`AttendanceSelect ${eventId}`}</span>
  ),
}));

jest.mock("~/components/EveMail/MailMessageViewer", () => ({
  MailMessageViewer: ({ content }: { content?: string }) => (
    <div data-testid="mail-message-viewer">{content}</div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withProvider(node: ReactNode) {
  return render(<MantineProvider>{node}</MantineProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// CalendarEventDetailsPanel
// ===========================================================================

describe("CalendarEventDetailsPanel", () => {
  const EVENT_VALUE = {
    data: {
      data: {
        date: "2024-06-01T18:00:00Z",
        owner_id: 1000125,
        text: "Fleet op tonight",
      },
    },
    canRespondToEvents: true,
  };

  const ATTENDEES_VALUE = {
    data: {
      data: [
        { character_id: 1, event_response: "accepted" },
        { character_id: 2, event_response: "declined" },
        { character_id: 3, event_response: undefined },
      ],
    },
  };

  const renderPanel = (
    eventOverride: Partial<typeof EVENT_VALUE> = {},
  ) => {
    mockUseCalendarEvent.mockReturnValue({ ...EVENT_VALUE, ...eventOverride });
    mockUseCalendarEventAttendees.mockReturnValue(ATTENDEES_VALUE);
    const {
      CalendarEventDetailsPanel,
    } = require("~/components/Calendar/CalendarEventDetailsPanel");
    return withProvider(
      <CalendarEventDetailsPanel characterId={123} eventId={456} />,
    );
  };

  it("renders the static section labels", () => {
    renderPanel();
    expect(screen.getByText("When")).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Your Response")).toBeInTheDocument();
    expect(screen.getByText("Attendees")).toBeInTheDocument();
  });

  it("renders the formatted event date and owner anchor", () => {
    renderPanel();
    expect(
      screen.getByText("Date 2024-06-01T18:00:00.000Z"),
    ).toBeInTheDocument();
    expect(screen.getByText("EntityAnchor 1000125")).toBeInTheDocument();
  });

  it("shows the attendance select when the user can respond", () => {
    renderPanel();
    expect(screen.getByTestId("attendance-select")).toBeInTheDocument();
  });

  it("shows the response badge when the user cannot respond", () => {
    renderPanel({ canRespondToEvents: false });
    expect(screen.queryByTestId("attendance-select")).not.toBeInTheDocument();
    expect(screen.getByText("ResponseBadge 456")).toBeInTheDocument();
  });

  it("renders the event body via the message viewer", () => {
    renderPanel();
    expect(screen.getByTestId("mail-message-viewer")).toHaveTextContent(
      "Fleet op tonight",
    );
  });

  it("renders a row for each attendee with the response badge text", () => {
    renderPanel();
    expect(screen.getByText("Char 1")).toBeInTheDocument();
    expect(screen.getByText("Char 2")).toBeInTheDocument();
    expect(screen.getByText("Char 3")).toBeInTheDocument();
    expect(screen.getByText("accepted")).toBeInTheDocument();
    expect(screen.getByText("declined")).toBeInTheDocument();
  });

  it("renders without crashing when event/attendee data is undefined", () => {
    mockUseCalendarEvent.mockReturnValue({
      data: undefined,
      canRespondToEvents: false,
    });
    mockUseCalendarEventAttendees.mockReturnValue({ data: undefined });
    const {
      CalendarEventDetailsPanel,
    } = require("~/components/Calendar/CalendarEventDetailsPanel");
    const { container } = withProvider(
      <CalendarEventDetailsPanel characterId={1} eventId={2} />,
    );
    expect(container).toBeInTheDocument();
    expect(screen.getByText("When")).toBeInTheDocument();
  });

  it("does not render the message viewer when there is no event text", () => {
    mockUseCalendarEvent.mockReturnValue({
      data: { data: { date: "2024-06-01T18:00:00Z", owner_id: 5 } },
      canRespondToEvents: false,
    });
    mockUseCalendarEventAttendees.mockReturnValue({ data: { data: [] } });
    const {
      CalendarEventDetailsPanel,
    } = require("~/components/Calendar/CalendarEventDetailsPanel");
    withProvider(<CalendarEventDetailsPanel characterId={1} eventId={2} />);
    expect(screen.queryByTestId("mail-message-viewer")).not.toBeInTheDocument();
  });
});

// ===========================================================================
// Calendar event lists (Desktop + Mobile share the same fixtures)
// ===========================================================================

const SAMPLE_EVENTS = [
  {
    event_id: 11,
    event_date: "2024-06-01T18:00:00Z",
    title: "CTA Fleet",
    importance: 1,
  },
  {
    event_id: 12,
    event_date: "2024-06-02T20:00:00Z",
    title: "Mining Op",
    importance: 0,
  },
];

describe("DesktopCalendarEventList", () => {
  const renderList = (events = SAMPLE_EVENTS) => {
    const {
      DesktopCalendarEventList,
    } = require("~/components/Calendar/CalendarEventList/DesktopCalendarEventList");
    return withProvider(
      <DesktopCalendarEventList characterId={123} events={events} />,
    );
  };

  it("renders a row per event with its title", () => {
    renderList();
    expect(screen.getByText("CTA Fleet")).toBeInTheDocument();
    expect(screen.getByText("Mining Op")).toBeInTheDocument();
  });

  it("renders a warning icon only for important events", () => {
    renderList();
    // importance === 1 renders a WarningIcon (twice in the desktop list source,
    // but the modal-title copy is only created on click) -> at least one.
    expect(screen.getAllByTestId("warning-icon").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("renders attendees and response badge per event", () => {
    renderList();
    expect(screen.getByText("Attendees 11")).toBeInTheDocument();
    expect(screen.getByText("ResponseBadge 11")).toBeInTheDocument();
  });

  it("opens the view-calendar-event modal when a title is clicked", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getByText("CTA Fleet"));
    expect(mockOpenContextModal).toHaveBeenCalledTimes(1);
    const config = mockOpenContextModal.mock.calls[0]![0] as {
      modal: string;
      innerProps: { eventId: number };
    };
    expect(config.modal).toBe("viewCalendarEvent");
    expect(config.innerProps.eventId).toBe(11);
  });

  it("renders without crashing for an empty events array", () => {
    const { container } = renderList([]);
    expect(container.querySelector("table")).toBeInTheDocument();
  });
});

describe("MobileCalendarEventList", () => {
  const renderList = (events = SAMPLE_EVENTS) => {
    const {
      MobileCalendarEventList,
    } = require("~/components/Calendar/CalendarEventList/MobileCalendarEventList");
    return withProvider(
      <MobileCalendarEventList characterId={123} events={events} />,
    );
  };

  it("renders a row per event with its title", () => {
    renderList();
    expect(screen.getByText("CTA Fleet")).toBeInTheDocument();
    expect(screen.getByText("Mining Op")).toBeInTheDocument();
  });

  it("renders attendees and response badge per event", () => {
    renderList();
    expect(screen.getByText("Attendees 11")).toBeInTheDocument();
    expect(screen.getByText("ResponseBadge 11")).toBeInTheDocument();
  });

  it("opens the view-calendar-event modal when a title is clicked", async () => {
    const user = userEvent.setup();
    renderList();
    await user.click(screen.getByText("Mining Op"));
    expect(mockOpenContextModal).toHaveBeenCalledTimes(1);
    const config = mockOpenContextModal.mock.calls[0]![0] as {
      innerProps: { eventId: number };
    };
    expect(config.innerProps.eventId).toBe(12);
  });

  it("renders without crashing for an empty events array", () => {
    const { container } = renderList([]);
    expect(container.querySelector("table")).toBeInTheDocument();
  });
});

// ===========================================================================
// CalendarEventList (responsive wrapper)
// ===========================================================================

describe("CalendarEventList", () => {
  it("renders both the desktop and mobile event lists", () => {
    const {
      CalendarEventList,
    } = require("~/components/Calendar/CalendarEventList/CalendarEventList");
    const { container } = withProvider(
      <CalendarEventList characterId={123} events={SAMPLE_EVENTS} />,
    );
    // Two <table> elements rendered (desktop + mobile variants).
    expect(container.querySelectorAll("table")).toHaveLength(2);
    // The event title appears in both tables.
    expect(screen.getAllByText("CTA Fleet").length).toBeGreaterThanOrEqual(2);
  });
});

// ===========================================================================
// CorporationAllianceHistoryTimeline (Timeline component wrapper)
// ===========================================================================

describe("CorporationAllianceHistoryTimeline", () => {
  const renderTimeline = (props = {}) => {
    const {
      CorporationAllianceHistoryTimeline,
    } = require("~/components/Timeline/CorporationAllianceHistoryTimeline");
    return withProvider(<CorporationAllianceHistoryTimeline {...props} />);
  };

  it("passes the fetched history to the UI timeline", () => {
    mockUseCorporationAllianceHistory.mockReturnValue({
      data: {
        data: [
          { record_id: 1, alliance_id: 99005338, start_date: "2020-01-01" },
          { record_id: 2, start_date: "2019-01-01" },
        ],
      },
    });
    renderTimeline({ corporationId: 98000001 });

    expect(mockUseCorporationAllianceHistory).toHaveBeenCalledWith(98000001);
    expect(screen.getAllByTestId("timeline-record")).toHaveLength(2);
    expect(
      screen.getByText("record 1 alliance 99005338"),
    ).toBeInTheDocument();
    expect(screen.getByText("record 2 alliance none")).toBeInTheDocument();
  });

  it("falls back to corporationId 0 when none is provided", () => {
    mockUseCorporationAllianceHistory.mockReturnValue({ data: undefined });
    renderTimeline();
    expect(mockUseCorporationAllianceHistory).toHaveBeenCalledWith(0);
    // Renders the (empty) UI timeline without crashing.
    expect(screen.getByTestId("ui-timeline")).toBeInTheDocument();
  });

  it("renders an empty timeline when history is undefined", () => {
    mockUseCorporationAllianceHistory.mockReturnValue({ data: undefined });
    renderTimeline({ corporationId: 5 });
    expect(screen.queryAllByTestId("timeline-record")).toHaveLength(0);
  });
});
