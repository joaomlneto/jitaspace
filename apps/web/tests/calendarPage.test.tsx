import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// apps/web/app/calendar/page.tsx is a "use client" page. It reads the selected
// character + the character's calendar events from @jitaspace/hooks, groups the
// events by day, and renders a per-day list plus a "Calendar View" modal
// trigger and the load-more / loading / "No more events" footer states.
// ---------------------------------------------------------------------------

const mockUseSelectedCharacter = jest.fn();
const mockUseCharacterCalendar = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useCharacterCalendar: (...args: unknown[]) =>
    mockUseCharacterCalendar(...args),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  CalendarIcon: () => <span data-testid="calendar-icon" />,
}));

// openModal is fired by the "Calendar View" button; capture its config so we
// can assert the modal children (the two EventsCalendar instances) are wired.
const mockOpenModal = jest.fn();
jest.mock("@mantine/modals", () => ({
  openModal: (...args: unknown[]) => mockOpenModal(...args),
}));

// Child components are mocked: CalendarEventList echoes how many events it got
// for a given day, EventsCalendar is a leaf marker.
jest.mock(
  "~/components/Calendar/CalendarEventList/CalendarEventList",
  () => ({
    CalendarEventList: ({
      characterId,
      events,
    }: {
      characterId?: number;
      events?: unknown[];
    }) => (
      <div data-testid="event-list">
        {`char:${characterId} count:${events?.length ?? 0}`}
      </div>
    ),
  }),
);

jest.mock("~/components/Calendar/EventsCalendar", () => ({
  __esModule: true,
  default: ({ size }: { size?: string }) => (
    <div data-testid="events-calendar">{`calendar-${size}`}</div>
  ),
}));

const CHARACTER = { characterId: 90000001 };

// Two events on 2024-03-10, one on 2024-03-12.
const EVENTS = [
  {
    event_id: 1,
    event_date: "2024-03-10T18:00:00Z",
    title: "Fleet Op Alpha",
  },
  {
    event_id: 2,
    event_date: "2024-03-10T20:30:00Z",
    title: "Fleet Op Bravo",
  },
  {
    event_id: 3,
    event_date: "2024-03-12T12:00:00Z",
    title: "Corp Meeting",
  },
  // No event_date -> skipped by the grouping logic.
  { event_id: 4, event_date: undefined, title: "Undated" },
];

function renderPage() {
  const Page = require("~/app/calendar/page").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("Calendar page (client)", () => {
  beforeEach(() => {
    mockUseSelectedCharacter.mockReset();
    mockUseCharacterCalendar.mockReset();
    mockOpenModal.mockReset();
    mockUseSelectedCharacter.mockReturnValue(CHARACTER);
  });

  it("groups events by day and renders a per-day list for each populated date", () => {
    mockUseCharacterCalendar.mockReturnValue({
      events: EVENTS,
      isLoading: false,
      hasMoreEvents: false,
      loadMoreEvents: jest.fn(),
    });

    renderPage();

    // Header
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
    expect(screen.getByText("Calendar View")).toBeInTheDocument();

    // Two distinct days -> two day headings (formatted "LLLL dd - EEEE").
    expect(screen.getByText("March 10 - Sunday")).toBeInTheDocument();
    expect(screen.getByText("March 12 - Tuesday")).toBeInTheDocument();

    // Two day groups -> two event lists; the 2024-03-10 group has 2 events.
    const lists = screen.getAllByTestId("event-list");
    expect(lists).toHaveLength(2);
    expect(
      screen.getByText(`char:${CHARACTER.characterId} count:2`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`char:${CHARACTER.characterId} count:1`),
    ).toBeInTheDocument();

    // Footer: not loading, no more events -> "No more events".
    expect(screen.getByText("No more events")).toBeInTheDocument();
  });

  it("opens the Calendar View modal with two EventsCalendar children when clicked", async () => {
    const user = userEvent.setup();
    mockUseCharacterCalendar.mockReturnValue({
      events: EVENTS,
      isLoading: false,
      hasMoreEvents: false,
      loadMoreEvents: jest.fn(),
    });

    renderPage();

    await user.click(screen.getByText("Calendar View"));
    expect(mockOpenModal).toHaveBeenCalledTimes(1);

    // Render the modal children passed to openModal to exercise the EventsCalendar JSX.
    const config = mockOpenModal.mock.calls[0]![0] as {
      title: string;
      children: ReactNode;
    };
    expect(config.title).toBe("Calendar View");
    render(<MantineProvider>{config.children}</MantineProvider>);
    const calendars = screen.getAllByTestId("events-calendar");
    expect(calendars).toHaveLength(2);
    expect(screen.getByText("calendar-xl")).toBeInTheDocument();
    expect(screen.getByText("calendar-sm")).toBeInTheDocument();
  });

  it("shows the loading spinner and the load-more button when more events exist", () => {
    const loadMoreEvents = jest.fn();
    mockUseCharacterCalendar.mockReturnValue({
      events: EVENTS,
      isLoading: true,
      hasMoreEvents: true,
      loadMoreEvents,
    });

    renderPage();

    // hasMoreEvents -> "Load more events" button present.
    expect(screen.getByText("Load more events")).toBeInTheDocument();
    // isLoading && !hasMoreEvents is false here, so the inline "Loading events"
    // footer text must NOT appear, and neither does "No more events".
    expect(screen.queryByText("Loading events")).not.toBeInTheDocument();
    expect(screen.queryByText("No more events")).not.toBeInTheDocument();
  });

  it("shows the inline 'Loading events' footer while loading with no more pages", () => {
    mockUseCharacterCalendar.mockReturnValue({
      events: [],
      isLoading: true,
      hasMoreEvents: false,
      loadMoreEvents: jest.fn(),
    });

    renderPage();

    // No grouped days for an empty event list.
    expect(screen.queryByTestId("event-list")).not.toBeInTheDocument();
    // isLoading && !hasMoreEvents -> inline loader + text.
    expect(screen.getByText("Loading events")).toBeInTheDocument();
    expect(screen.queryByText("No more events")).not.toBeInTheDocument();
  });

  it("renders an empty calendar (no character, no events) with the empty footer", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseCharacterCalendar.mockReturnValue({
      events: undefined,
      isLoading: false,
      hasMoreEvents: false,
      loadMoreEvents: jest.fn(),
    });

    renderPage();

    expect(screen.getByText("Calendar")).toBeInTheDocument();
    // No events -> no day groups / event lists.
    expect(screen.queryByTestId("event-list")).not.toBeInTheDocument();
    // Footer empty state.
    expect(screen.getByText("No more events")).toBeInTheDocument();
  });
});
