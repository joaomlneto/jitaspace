import "@testing-library/jest-dom/jest-globals";

import type React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// EsiCurrentShipFittingCard is the adapter between useCharacterCurrentFit and
// the presentational <ShipFittingCard>. Three things are worth pinning here:
//  * it tells the hook whether the modules are actually going to be rendered
//    (`includeModules`), because resolving them costs a full walk of the
//    character's assets — a cost a `hideModules` card would just discard;
//  * `hideModules` is now destructured out of the props, so it has to be
//    forwarded explicitly — dropping it would make the collapsed landing-page
//    cards start rendering module sections;
//  * the hook's `isLoading` has to reach the card, or an empty fit reads as
//    "this ship has no modules" while the asset pages are still streaming in.
// We stub the hook and swap ShipFittingCard for a tiny inspector that echoes
// the props it received.
// ---------------------------------------------------------------------------

interface CurrentFit {
  hasToken: boolean;
  isLoading: boolean;
  error?: unknown;
  name?: string;
  shipTypeId?: number;
  items?: {
    type_id: number;
    location_flag: string;
    quantity?: number;
  }[];
}

const mockUseCharacterCurrentFit =
  jest.fn<
    (characterId: number, options?: { includeModules?: boolean }) => CurrentFit
  >();

jest.mock("@jitaspace/hooks", () => ({
  useCharacterCurrentFit: (
    characterId: number,
    options?: { includeModules?: boolean },
  ) => mockUseCharacterCurrentFit(characterId, options),
}));

jest.mock("~/components/Fitting/ShipFittingCard/ShipFittingCard", () => {
  const React = require("react");
  return {
    ShipFittingCard: ({
      name,
      description,
      shipTypeId,
      hideModules,
      isLoading,
      items,
    }: {
      name?: string;
      description?: string;
      shipTypeId?: number;
      hideModules?: boolean;
      isLoading?: boolean;
      items: { typeId: number; flag: string; quantity?: number }[];
    }) =>
      React.createElement(
        "div",
        { "data-testid": "ship-fitting-card" },
        React.createElement(
          "span",
          { "data-testid": "card-summary" },
          `name-${name ?? "none"}|desc-${description ?? "none"}|ship-${shipTypeId ?? "none"}`,
        ),
        React.createElement(
          "span",
          { "data-testid": "card-flags" },
          `hideModules-${String(hideModules)}|isLoading-${String(isLoading)}`,
        ),
        items.map((item, index) =>
          React.createElement(
            "span",
            { "data-testid": "card-item", key: index },
            `${item.flag}|${item.typeId}|x${item.quantity ?? "none"}`,
          ),
        ),
      ),
  };
});

const LOADED_FIT: CurrentFit = {
  hasToken: true,
  isLoading: false,
  name: "Rusty Rifter",
  shipTypeId: 587,
  items: [
    { type_id: 100, location_flag: "HiSlot0", quantity: 1 },
    { type_id: 200, location_flag: "Cargo", quantity: 7 },
  ],
};

function renderCard(
  fit: CurrentFit,
  props: {
    characterId?: number;
    hideModules?: boolean;
    hideFallback?: boolean;
    fallback?: React.ReactNode;
  } = {},
) {
  mockUseCharacterCurrentFit.mockReturnValue(fit);
  const {
    EsiCurrentShipFittingCard,
  } = require("~/components/Fitting/ShipFittingCard/EsiCurrentShipFittingCard");
  const { characterId = 1234, ...cardProps } = props;
  return render(
    <MantineProvider>
      <EsiCurrentShipFittingCard characterId={characterId} {...cardProps} />
    </MantineProvider>,
  );
}

describe("EsiCurrentShipFittingCard", () => {
  beforeEach(() => {
    mockUseCharacterCurrentFit.mockReset();
  });

  it("asks the hook to resolve the modules when they are going to be rendered", () => {
    renderCard(LOADED_FIT);
    expect(mockUseCharacterCurrentFit).toHaveBeenCalledWith(1234, {
      includeModules: true,
    });
  });

  it("asks the hook to skip the asset walk when hideModules is set", () => {
    renderCard(LOADED_FIT, { hideModules: true });
    expect(mockUseCharacterCurrentFit).toHaveBeenCalledWith(1234, {
      includeModules: false,
    });
  });

  it("still forwards hideModules to ShipFittingCard after destructuring it out", () => {
    renderCard(LOADED_FIT, { hideModules: true });
    // Consumed for `includeModules` AND handed on: the card is what actually
    // suppresses the module sections.
    expect(screen.getByTestId("card-flags")).toHaveTextContent(
      "hideModules-true",
    );
  });

  it("leaves hideModules false on the card when the caller did not set it", () => {
    renderCard(LOADED_FIT);
    expect(screen.getByTestId("card-flags")).toHaveTextContent(
      "hideModules-false",
    );
  });

  it("forwards the hook's isLoading to ShipFittingCard", () => {
    renderCard({ ...LOADED_FIT, isLoading: true, items: undefined });
    expect(screen.getByTestId("card-flags")).toHaveTextContent(
      "isLoading-true",
    );
    // No items yet — the card needs the flag to tell "empty" from "pending".
    expect(screen.queryByTestId("card-item")).not.toBeInTheDocument();
  });

  it("forwards isLoading false once the fit has resolved", () => {
    renderCard(LOADED_FIT);
    expect(screen.getByTestId("card-flags")).toHaveTextContent(
      "isLoading-false",
    );
  });

  it("maps the ESI item shape onto the card's item shape", () => {
    renderCard(LOADED_FIT);
    expect(screen.getByTestId("card-summary")).toHaveTextContent(
      "name-Rusty Rifter|desc-Current Ship|ship-587",
    );
    const items = screen
      .getAllByTestId("card-item")
      .map((node) => node.textContent);
    expect(items).toEqual(["HiSlot0|100|x1", "Cargo|200|x7"]);
  });

  it("renders the default fallback text and no card when the character has no token", () => {
    renderCard({ hasToken: false, isLoading: false });
    expect(screen.queryByTestId("ship-fitting-card")).not.toBeInTheDocument();
    expect(
      screen.getByText("Active Ship Fitting not available"),
    ).toBeInTheDocument();
  });

  it("renders the caller's fallback instead of the card when there is no token", () => {
    renderCard(
      { hasToken: false, isLoading: true },
      { fallback: <span data-testid="custom-fallback">nope</span> },
    );
    expect(screen.queryByTestId("ship-fitting-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
  });

  it("renders nothing at all when there is no token and hideFallback is set", () => {
    const { container } = renderCard(
      { hasToken: false, isLoading: false },
      { hideFallback: true },
    );
    expect(screen.queryByTestId("ship-fitting-card")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Active Ship Fitting not available"),
    ).not.toBeInTheDocument();
    // Nothing but the <style> tags MantineProvider injects of its own accord.
    expect(container.querySelectorAll("*:not(style)")).toHaveLength(0);
  });
});
