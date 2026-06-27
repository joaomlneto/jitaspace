import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

import { captureMock } from "../__mocks__/posthogMocks";

const mockUseSelectedCharacter = jest.fn();
const mockUseCharacterFittings = jest.fn();
jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useCharacterFittings: (...args: unknown[]) =>
    mockUseCharacterFittings(...args),
}));

jest.mock("@jitaspace/eve-components", () => ({
  EveEntitySelect: () => <div data-testid="ship-type-select" />,
}));

jest.mock("@jitaspace/eve-icons", () => ({
  FittingIcon: () => <span data-testid="fitting-icon" />,
}));

const mockOpenContextModal = jest.fn();
jest.mock("@mantine/modals", () => ({
  openContextModal: (...args: unknown[]) => mockOpenContextModal(...args),
}));

jest.mock("~/components/Fitting", () => ({
  EsiCurrentShipFittingCard: () => <div data-testid="current-ship-card" />,
  EsiCharacterShipFittingCard: () => <div data-testid="saved-fit-card" />,
}));

jest.mock("~/components/ScopeGuard", () => ({
  ScopeGuard: ({ children }: { children?: React.ReactNode }) => children,
}));

const CHARACTER = {
  characterId: 90000001,
  accessTokenPayload: {
    scp: ["esi-assets.read_assets.v1", "esi-location.read_ship_type.v1"],
  },
};

const FITTING = {
  fitting_id: 555,
  ship_type_id: 587,
  name: "Rifter Roam",
  description: "fast",
  items: [{ type_id: 2456, flag: 27, quantity: 1 }],
};

function renderPage() {
  const Page = require("~/app/fittings/page").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("Fittings page", () => {
  beforeEach(() => {
    captureMock.mockClear();
    mockOpenContextModal.mockReset();
    mockUseSelectedCharacter.mockReset().mockReturnValue(CHARACTER);
    mockUseCharacterFittings
      .mockReset()
      .mockReturnValue({ data: { data: [FITTING] } });
  });

  it("captures current_ship_fitting_viewed and opens the modal", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("current-ship-card"));

    expect(captureMock).toHaveBeenCalledWith("current_ship_fitting_viewed", {
      character_id: 90000001,
    });
    expect(mockOpenContextModal).toHaveBeenCalledWith(
      expect.objectContaining({ modal: "currentShipFitting" }),
    );
  });

  it("captures fitting_viewed for a saved fitting and opens the modal", () => {
    renderPage();

    fireEvent.click(screen.getByTestId("saved-fit-card"));

    expect(captureMock).toHaveBeenCalledWith("fitting_viewed", {
      fitting_id: 555,
      ship_type_id: 587,
      fitting_name: "Rifter Roam",
    });
    expect(mockOpenContextModal).toHaveBeenCalledWith(
      expect.objectContaining({ modal: "fitting" }),
    );
  });
});
