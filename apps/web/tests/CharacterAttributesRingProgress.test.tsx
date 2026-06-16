import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseCharacterAttributes = jest.fn();

jest.mock("@jitaspace/hooks/src/hooks/skills", () => ({
  useCharacterAttributes: (characterId: number) =>
    mockUseCharacterAttributes(characterId),
}));

// EVE icon components are decorative; stub them so the ring labels render
// without pulling in real icon assets.
jest.mock("@jitaspace/eve-icons", () => new Proxy({}, { get: () => () => null }));

function renderComponent() {
  const {
    CharacterAttributesRingProgress,
  } = require("~/components/Skills/CharacterAttributesRingProgress");
  return render(
    <MantineProvider>
      <CharacterAttributesRingProgress characterId={1} />
    </MantineProvider>,
  );
}

describe("CharacterAttributesRingProgress", () => {
  beforeEach(() => {
    mockUseCharacterAttributes.mockReset();
  });

  it("shows a loading state while attributes are fetching", () => {
    mockUseCharacterAttributes.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
    });
    renderComponent();
    expect(screen.getByText("LOADING")).toBeInTheDocument();
  });

  it("shows an error state when the request fails", () => {
    mockUseCharacterAttributes.mockReturnValue({
      data: undefined,
      error: new Error("boom"),
      isLoading: false,
    });
    renderComponent();
    expect(screen.getByText("ERROR")).toBeInTheDocument();
  });

  it("renders each attribute ring and the remap status when data is available", () => {
    mockUseCharacterAttributes.mockReturnValue({
      data: {
        data: {
          charisma: 20,
          intelligence: 21,
          memory: 19,
          perception: 22,
          willpower: 18,
          bonus_remaps: 2,
          // cooldown already elapsed -> remap is "Available"
          accrued_remap_cooldown_date: "2000-01-01T00:00:00Z",
          last_remap_date: "2010-06-01T12:00:00Z",
        },
      },
      error: undefined,
      isLoading: false,
    });
    renderComponent();

    // attribute labels + values from the ring sections
    expect(screen.getByText("charisma")).toBeInTheDocument();
    expect(screen.getByText("willpower")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    // remap cooldown is in the past -> "Available"
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("labels remap as Bonus when cooldown has not elapsed but bonus remaps exist", () => {
    mockUseCharacterAttributes.mockReturnValue({
      data: {
        data: {
          charisma: 20,
          intelligence: 21,
          memory: 19,
          perception: 22,
          willpower: 18,
          bonus_remaps: 1,
          accrued_remap_cooldown_date: "2999-01-01T00:00:00Z",
        },
      },
      error: undefined,
      isLoading: false,
    });
    renderComponent();
    expect(screen.getByText("Bonus")).toBeInTheDocument();
  });
});
