import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// Stub the leaf avatar/name components — we only care about wiring here.
jest.mock("../../Avatar", () => ({
  CharacterAvatar: ({ characterId }: { characterId?: number }) => (
    <span data-testid="character-avatar" data-character-id={String(characterId)}>
      {`Avatar ${characterId}`}
    </span>
  ),
}));

jest.mock("../../Text", () => ({
  CharacterName: ({ characterId }: { characterId?: number }) => (
    <span data-testid="character-name">{`Name ${characterId}`}</span>
  ),
}));

const {
  CalendarEventAttendeesAvatarGroup,
} = require("../../AvatarGroup/CalendarEventAttendeesAvatarGroup") as typeof import("../../AvatarGroup/CalendarEventAttendeesAvatarGroup");

const renderWithMantine = (ui: ReactNode) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const attendee = (id: number, response = "accepted") => ({
  character_id: id,
  event_response: response,
});

describe("CalendarEventAttendeesAvatarGroup", () => {
  it("renders a loading skeleton when attendees are undefined", () => {
    const { container } = renderWithMantine(
      <CalendarEventAttendeesAvatarGroup />,
    );
    // No resolved character avatars while loading
    expect(screen.queryByTestId("character-avatar")).not.toBeInTheDocument();
    expect(
      container.querySelector(".mantine-Skeleton-root"),
    ).toBeInTheDocument();
  });

  it("renders an avatar for each accepted attendee", () => {
    renderWithMantine(
      <CalendarEventAttendeesAvatarGroup
        attendees={[attendee(1), attendee(2), attendee(3)]}
      />,
    );
    expect(screen.getAllByTestId("character-avatar")).toHaveLength(3);
    const ids = screen
      .getAllByTestId("character-avatar")
      .map((n) => n.getAttribute("data-character-id"));
    expect(ids).toEqual(expect.arrayContaining(["1", "2", "3"]));
  });

  it("excludes attendees who have not accepted", () => {
    renderWithMantine(
      <CalendarEventAttendeesAvatarGroup
        attendees={[
          attendee(1, "accepted"),
          attendee(2, "declined"),
          attendee(3, "tentative"),
          attendee(4, "not_responded"),
        ]}
      />,
    );
    const avatars = screen.getAllByTestId("character-avatar");
    expect(avatars).toHaveLength(1);
    expect(avatars[0]).toHaveAttribute("data-character-id", "1");
  });

  it("renders an empty group when there are no accepted attendees", () => {
    renderWithMantine(
      <CalendarEventAttendeesAvatarGroup
        attendees={[attendee(1, "declined")]}
      />,
    );
    expect(screen.queryByTestId("character-avatar")).not.toBeInTheDocument();
  });

  it("shows an overflow '+N' badge when the accepted count exceeds the limit", () => {
    renderWithMantine(
      <CalendarEventAttendeesAvatarGroup
        attendees={[attendee(1), attendee(2), attendee(3), attendee(4)]}
        limit={2}
      />,
    );
    // limit=2 with 4 accepted -> show (limit-1)=1 avatar + "+3" overflow badge
    expect(screen.getAllByTestId("character-avatar")).toHaveLength(1);
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("does not show an overflow badge when within the limit", () => {
    renderWithMantine(
      <CalendarEventAttendeesAvatarGroup
        attendees={[attendee(1), attendee(2)]}
        limit={5}
      />,
    );
    expect(screen.getAllByTestId("character-avatar")).toHaveLength(2);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});
