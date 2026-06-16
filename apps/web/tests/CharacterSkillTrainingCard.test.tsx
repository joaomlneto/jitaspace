import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseCharacterSkillQueue = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useCharacterSkillQueue: (characterId: number) =>
    mockUseCharacterSkillQueue(characterId),
}));

// EVE UI components render avatars / live time text; stub them so the card body
// executes without the heavy rendering. TimeAgoText is replaced with a marker.
jest.mock("@jitaspace/ui", () => ({
  TimeAgoText: () => <span>time-ago</span>,
  TypeAvatar: () => null,
  TypeName: () => null,
}));

jest.mock("@jitaspace/utils", () => ({
  skillLevelRomanNumeral: (level?: number) => `L${level}`,
}));

// CSS module is imported for class names only.
jest.mock("~/components/Card/SolarSystemCard.module.css", () => ({}));

function renderComponent(props: Record<string, unknown> = {}) {
  const {
    CharacterSkillTrainingCard,
  } = require("~/components/Card/CharacterSkillTrainingCard");
  return render(
    <MantineProvider>
      <CharacterSkillTrainingCard characterId={1} {...props} />
    </MantineProvider>,
  );
}

describe("CharacterSkillTrainingCard", () => {
  beforeEach(() => {
    mockUseCharacterSkillQueue.mockReset();
  });

  it("renders the default fallback when no data is available", () => {
    mockUseCharacterSkillQueue.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    });
    renderComponent();
    expect(
      screen.getByText("Character skill queue not available"),
    ).toBeInTheDocument();
  });

  it("renders a custom fallback when provided and there is no data", () => {
    mockUseCharacterSkillQueue.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    });
    renderComponent({ fallback: <span>custom fallback</span> });
    expect(screen.getByText("custom fallback")).toBeInTheDocument();
  });

  it("renders nothing when hideFallback is set and there is no data", () => {
    mockUseCharacterSkillQueue.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    });
    renderComponent({ hideFallback: true });
    // component returns null: neither the default fallback nor any card content
    expect(
      screen.queryByText("Character skill queue not available"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("No skill in training")).not.toBeInTheDocument();
  });

  it("shows 'No skill in training' when the queue has no active skill", () => {
    mockUseCharacterSkillQueue.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      error: undefined,
    });
    renderComponent();
    expect(screen.getByText("No skill in training")).toBeInTheDocument();
  });

  it("renders the active skill ring, level and remaining time", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    mockUseCharacterSkillQueue.mockReturnValue({
      data: {
        data: [
          {
            skill_id: 3300,
            finished_level: 4,
            start_date: past,
            finish_date: future,
          },
        ],
      },
      isLoading: false,
      error: undefined,
    });
    renderComponent();
    // roman numeral comes from the mocked util
    expect(screen.getByText("L4")).toBeInTheDocument();
    // remaining time uses the stubbed TimeAgoText marker
    expect(screen.getByText("time-ago")).toBeInTheDocument();
    expect(screen.getByText("remaining")).toBeInTheDocument();
  });
});
