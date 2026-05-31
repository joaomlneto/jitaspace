import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseCharacterOnlineStatus =
  jest.fn<typeof import("@jitaspace/hooks").useCharacterOnlineStatus>();

jest.mock("@jitaspace/hooks", () => ({
  useCharacterOnlineStatus: (...args: unknown[]) =>
    mockUseCharacterOnlineStatus(
      ...(args as Parameters<
        typeof import("@jitaspace/hooks").useCharacterOnlineStatus
      >),
    ),
}));

const {
  CharacterOnlineIndicator,
} = require("../../Indicator/CharacterOnlineIndicator") as typeof import("../../Indicator/CharacterOnlineIndicator");
const {
  TotalUnreadMailsIndicator,
} = require("../../Indicator/TotalUnreadMailsIndicator") as typeof import("../../Indicator/TotalUnreadMailsIndicator");

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const onlineStatus = (online: boolean, isSuccess = true) =>
  ({
    data: { data: { online } },
    isSuccess,
  }) as unknown as ReturnType<
    typeof import("@jitaspace/hooks").useCharacterOnlineStatus
  >;

// The visible coloured dot Mantine renders inside Indicator.
const indicatorDot = (container: HTMLElement) =>
  container.querySelector(".mantine-Indicator-indicator");

// Mantine exposes the resolved indicator color as a CSS custom property
// (--indicator-color) on the root element.
const indicatorColor = (container: HTMLElement) =>
  container
    .querySelector(".mantine-Indicator-root")
    ?.getAttribute("style") ?? "";

describe("CharacterOnlineIndicator", () => {
  beforeEach(() => {
    mockUseCharacterOnlineStatus.mockReturnValue(onlineStatus(false, false));
  });

  it("passes the characterId to the online-status hook", () => {
    renderWithMantine(<CharacterOnlineIndicator characterId={123} />);
    expect(mockUseCharacterOnlineStatus).toHaveBeenCalledWith(123);
  });

  it("shows a green dot when the character is online", () => {
    mockUseCharacterOnlineStatus.mockReturnValue(onlineStatus(true));
    const { container } = renderWithMantine(
      <CharacterOnlineIndicator characterId={1}>
        <span>avatar</span>
      </CharacterOnlineIndicator>,
    );
    expect(indicatorDot(container)).toBeInTheDocument();
    // Green resolves to a var(--mantine-color-green-*) custom property
    expect(indicatorColor(container)).toContain("green");
  });

  it("shows a red dot when the character is offline", () => {
    mockUseCharacterOnlineStatus.mockReturnValue(onlineStatus(false));
    const { container } = renderWithMantine(
      <CharacterOnlineIndicator characterId={1}>
        <span>avatar</span>
      </CharacterOnlineIndicator>,
    );
    expect(indicatorDot(container)).toBeInTheDocument();
    expect(indicatorColor(container)).toContain("red");
  });

  it("is disabled (no dot) while the query has not succeeded", () => {
    mockUseCharacterOnlineStatus.mockReturnValue(onlineStatus(false, false));
    const { container } = renderWithMantine(
      <CharacterOnlineIndicator characterId={1}>
        <span>avatar</span>
      </CharacterOnlineIndicator>,
    );
    // When disabled, Mantine does not render the indicator dot at all
    expect(indicatorDot(container)).not.toBeInTheDocument();
    expect(screen.getByText("avatar")).toBeInTheDocument();
  });
});

describe("TotalUnreadMailsIndicator", () => {
  it("renders the unread count as the indicator label", () => {
    renderWithMantine(
      <TotalUnreadMailsIndicator totalUnreadCount={7}>
        <span>mail</span>
      </TotalUnreadMailsIndicator>,
    );
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("mail")).toBeInTheDocument();
  });

  it("is disabled (no dot) when the count is zero", () => {
    const { container } = renderWithMantine(
      <TotalUnreadMailsIndicator totalUnreadCount={0}>
        <span>mail</span>
      </TotalUnreadMailsIndicator>,
    );
    expect(container.querySelector(".mantine-Indicator-indicator")).not
      .toBeInTheDocument();
  });

  it("is disabled (no dot) when the count is undefined", () => {
    const { container } = renderWithMantine(
      <TotalUnreadMailsIndicator>
        <span>mail</span>
      </TotalUnreadMailsIndicator>,
    );
    expect(container.querySelector(".mantine-Indicator-indicator")).not
      .toBeInTheDocument();
  });

  it("forwards extra Indicator props such as color", () => {
    const { container } = renderWithMantine(
      <TotalUnreadMailsIndicator totalUnreadCount={3} color="blue">
        <span>mail</span>
      </TotalUnreadMailsIndicator>,
    );
    expect(
      container.querySelector(".mantine-Indicator-indicator"),
    ).toBeInTheDocument();
    expect(indicatorColor(container)).toContain("blue");
  });
});
