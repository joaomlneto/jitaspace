import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Suspense } from "react";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";

// ---------------------------------------------------------------------------
// The calendar event page reads its eventId from React.use(params) (a Promise),
// not useParams. It uses @jitaspace/hooks, @jitaspace/ui, @jitaspace/eve-icons
// and several local components.
// ---------------------------------------------------------------------------

const mockUseSelectedCharacter = jest.fn();
const mockUseCalendarEvent = jest.fn();
const mockUseCalendarEventAttendees = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useCalendarEvent: (...args: unknown[]) => mockUseCalendarEvent(...args),
  useCalendarEventAttendees: (...args: unknown[]) =>
    mockUseCalendarEventAttendees(...args),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  CalendarIcon: () => <span>CalendarIcon</span>,
  WarningIcon: () => <span data-testid="warning-icon">WarningIcon</span>,
}));

jest.mock("@jitaspace/ui", () => ({
  DateHoverCard: ({ children }: { children?: ReactNode }) => <>{children}</>,
  CharacterAnchor: ({ children }: { children?: ReactNode }) => (
    <a href="#">{children}</a>
  ),
  CharacterAvatar: ({ characterId }: { characterId: number }) => (
    <span>{`Avatar ${characterId}`}</span>
  ),
  CharacterName: ({ characterId }: { characterId: number }) => (
    <span>{`Name ${characterId}`}</span>
  ),
  EveEntityNameAnchor: ({ entityId }: { entityId?: number }) => (
    <a href="#">{`Entity ${entityId ?? "none"}`}</a>
  ),
  FormattedDateText: ({ date }: { date?: Date }) => (
    <span>{date ? `Date ${date.toISOString()}` : "No date"}</span>
  ),
}));

jest.mock("~/components/Avatar", () => ({
  CalendarEventOwnerAvatar: () => <span>OwnerAvatar</span>,
}));

jest.mock("~/components/Badge", () => ({
  CalendarEventResponseBadge: () => <span>ResponseBadge</span>,
}));

jest.mock("~/components/DurationText", () => ({
  CalendarEventHumanDurationText: () => <span>DurationText</span>,
}));

jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content: string }) => (
    <div data-testid="message-viewer">{content}</div>
  ),
}));

// React.use() reads a promise synchronously when it has already been
// resolved and tagged with the internal { status, value } fields. Building
// such a thenable avoids Suspense round-trips inside jsdom.
function resolvedThenable<T>(value: T): Promise<T> {
  const thenable = Promise.resolve(value) as Promise<T> & {
    status?: string;
    value?: T;
  };
  thenable.status = "fulfilled";
  thenable.value = value;
  return thenable;
}

function renderPage() {
  const Page = require("~/app/calendar/[eventId]/page.client").default;
  return render(
    <MantineProvider>
      <Suspense fallback={<div>loading suspense</div>}>
        <Page params={resolvedThenable({ eventId: "42" })} />
      </Suspense>
    </MantineProvider>,
  );
}

describe("Calendar Event Page", () => {
  beforeEach(() => {
    mockUseSelectedCharacter.mockReset();
    mockUseCalendarEvent.mockReset();
    mockUseCalendarEventAttendees.mockReset();
  });

  it("renders a fully-loaded important event with sorted attendees", async () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 123 });
    mockUseCalendarEvent.mockReturnValue({
      data: {
        data: {
          title: "Fleet Op",
          text: "<b>Be there</b>",
          date: "2025-06-01T18:00:00Z",
          importance: 1,
          owner_id: 999,
        },
      },
      isLoading: false,
    });
    mockUseCalendarEventAttendees.mockReturnValue({
      data: {
        data: [
          { character_id: 1, event_response: "accepted" },
          { character_id: 2, event_response: "declined" },
          { character_id: 3, event_response: undefined },
          { character_id: 4, event_response: "tentative" },
        ],
      },
      isLoading: false,
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Fleet Op")).toBeInTheDocument(),
    );
    // importance === 1 -> warning icon shown
    expect(screen.getByTestId("warning-icon")).toBeInTheDocument();
    // message viewer with the event text
    expect(screen.getByTestId("message-viewer")).toHaveTextContent(
      "<b>Be there</b>",
    );
    // owner entity anchor
    expect(screen.getByText("Entity 999")).toBeInTheDocument();
    // attendee names rendered
    expect(screen.getByText("Name 1")).toBeInTheDocument();
    expect(screen.getByText("Name 4")).toBeInTheDocument();
    // character-dependent components
    expect(screen.getByText("DurationText")).toBeInTheDocument();
    expect(screen.getByText("ResponseBadge")).toBeInTheDocument();
    expect(screen.getByText("OwnerAvatar")).toBeInTheDocument();
    // section headers
    expect(screen.getByText("Attendees")).toBeInTheDocument();
  });

  it("passes the parsed eventId and selected character to the hooks", async () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 555 });
    mockUseCalendarEvent.mockReturnValue({ data: undefined, isLoading: false });
    mockUseCalendarEventAttendees.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    renderPage();

    await waitFor(() => expect(mockUseCalendarEvent).toHaveBeenCalled());
    expect(mockUseCalendarEvent).toHaveBeenCalledWith(555, 42);
    expect(mockUseCalendarEventAttendees).toHaveBeenCalledWith(555, 42);
  });

  it("renders loader and fallbacks when data is undefined and no character", async () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);
    mockUseCalendarEvent.mockReturnValue({ data: undefined, isLoading: true });
    mockUseCalendarEventAttendees.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    renderPage();

    // Title "Calendar" still renders
    await waitFor(() =>
      expect(screen.getByText("Calendar")).toBeInTheDocument(),
    );
    // No warning icon (no importance)
    expect(screen.queryByTestId("warning-icon")).not.toBeInTheDocument();
    // EveEntityNameAnchor receives undefined owner
    expect(screen.getByText("Entity none")).toBeInTheDocument();
    // character-dependent components are not rendered without a character
    expect(screen.queryByText("DurationText")).not.toBeInTheDocument();
    expect(screen.queryByText("ResponseBadge")).not.toBeInTheDocument();
    // FormattedDateText with undefined date -> "No date"
    expect(screen.getByText("No date")).toBeInTheDocument();
  });

  it("renders a non-important event without the warning icon", async () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 7 });
    mockUseCalendarEvent.mockReturnValue({
      data: {
        data: {
          title: "Casual Meetup",
          text: "",
          date: "2025-07-01T10:00:00Z",
          importance: 0,
          owner_id: 1234,
        },
      },
      isLoading: false,
    });
    mockUseCalendarEventAttendees.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    });

    renderPage();

    await waitFor(() =>
      expect(screen.getByText("Casual Meetup")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("warning-icon")).not.toBeInTheDocument();
    expect(screen.getByText("Entity 1234")).toBeInTheDocument();
  });
});
