import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

import { captureMock } from "../__mocks__/posthogMocks";

const mockUseSelectedCharacter = jest.fn();
const mockUseMultipleCharacterFittings = jest.fn();
jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
  useMultipleCharacterFittings: () => mockUseMultipleCharacterFittings(),
}));

// Renders one button per option so tests can actually pick a value: the real
// component is a Mantine Select, and without a way to fire onChange the filter
// predicates never run.
jest.mock("@jitaspace/eve-components", () => ({
  EveEntitySelect: ({
    label,
    entityIds,
    onChange,
  }: {
    label?: string;
    entityIds?: { id: number }[];
    onChange?: (value: string | null) => void;
  }) => (
    <div data-testid={`select:${label}`}>
      {(entityIds ?? []).map(({ id }) => (
        <button
          key={id}
          data-testid={`option:${label}:${id}`}
          onClick={() => onChange?.(String(id))}
        >
          {id}
        </button>
      ))}
    </div>
  ),
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
  subjectId: 90000001,
};

// A second character holding a fitting with the SAME fitting_id: ESI ids are
// only unique within a character.
const OTHER_CHARACTER_FITTING = {
  ...FITTING,
  name: "Punisher Roam",
  ship_type_id: 597,
  subjectId: 90000002,
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
    mockUseMultipleCharacterFittings
      .mockReset()
      .mockReturnValue({ data: [FITTING, OTHER_CHARACTER_FITTING] });
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

    fireEvent.click(screen.getAllByTestId("saved-fit-card")[0]!);

    expect(captureMock).toHaveBeenCalledWith("fitting_viewed", {
      fitting_id: 555,
      ship_type_id: 587,
      fitting_name: "Rifter Roam",
      character_id: 90000001,
    });
    expect(mockOpenContextModal).toHaveBeenCalledWith(
      expect.objectContaining({ modal: "fitting" }),
    );
  });

  it("lists fittings from every logged-in character", () => {
    renderPage();

    // Both characters' fittings render even though they share a fitting_id.
    expect(screen.getAllByTestId("saved-fit-card")).toHaveLength(2);
  });

  it("narrows to one character's fittings when that character is picked", () => {
    renderPage();
    expect(screen.getAllByTestId("saved-fit-card")).toHaveLength(2);

    fireEvent.click(screen.getByTestId("option:Filter by character:90000002"));

    expect(screen.getAllByTestId("saved-fit-card")).toHaveLength(1);
  });

  it("offers one character option per character that owns a fitting", () => {
    renderPage();

    expect(
      screen.getByTestId("option:Filter by character:90000001"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("option:Filter by character:90000002"),
    ).toBeInTheDocument();
  });

  it("narrows by ship type independently of character", () => {
    renderPage();

    // 597 belongs only to the second character's fitting.
    fireEvent.click(screen.getByTestId("option:Filter by ship type:597"));

    expect(screen.getAllByTestId("saved-fit-card")).toHaveLength(1);
  });

  it("renders a character filter alongside the ship type filter", () => {
    renderPage();

    expect(
      screen.getByTestId("select:Filter by ship type"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("select:Filter by character"),
    ).toBeInTheDocument();
  });
});
