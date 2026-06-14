import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// DnaShipFittingCard's job is to (a) parse an EVE "DNA" fitting string and
// (b) resolve each item's slot flag from type dogma effects (fetched via
// useTypes), then hand the result to <ShipFittingCard>. We stub the heavy
// ShipFittingCard child with a tiny inspector that serialises the props it
// receives, so we can assert on the parsing/slot-assignment logic directly.
// ---------------------------------------------------------------------------

const mockUseTypes = jest.fn<(typeIds: number[]) => { data: unknown }>();

jest.mock("@jitaspace/hooks", () => ({
  useTypes: (typeIds: number[]) => mockUseTypes(typeIds),
}));

jest.mock(
  "~/components/Fitting/ShipFittingCard/ShipFittingCard",
  () => {
    const React = require("react");
    return {
      ShipFittingCard: ({
        name,
        shipTypeId,
        items,
        hideHeader,
        hideModules,
      }: {
        name?: string;
        shipTypeId?: number;
        items: { typeId: number; quantity: number; flag: string }[];
        hideHeader?: boolean;
        hideModules?: boolean;
      }) =>
        React.createElement(
          "div",
          { "data-testid": "ship-fitting-card" },
          React.createElement(
            "span",
            { "data-testid": "ship-type-id" },
            `ship-${shipTypeId}`,
          ),
          React.createElement(
            "span",
            { "data-testid": "ship-name" },
            `name-${name ?? "none"}`,
          ),
          React.createElement(
            "span",
            { "data-testid": "hide-flags" },
            `header-${String(!!hideHeader)}-modules-${String(!!hideModules)}`,
          ),
          items.map((item, index) =>
            React.createElement(
              "span",
              { "data-testid": "fitting-item", key: index },
              `${item.flag}|${item.typeId}|x${item.quantity}`,
            ),
          ),
        ),
    };
  },
);

// A type entry carrying the dogma effect that marks a given slot.
function typeWithEffect(typeId: number, effectId: number) {
  return { type_id: typeId, dogma_effects: [{ effect_id: effectId }] };
}

function renderCard(
  props: {
    dna: string;
    name?: string;
    hideHeader?: boolean;
    hideModules?: boolean;
  },
  typeData: Record<number, unknown> = {},
) {
  mockUseTypes.mockReturnValue({ data: typeData });
  const {
    DnaShipFittingCard,
  } = require("~/components/Fitting/ShipFittingCard/DnaShipFittingCard");
  return render(
    <MantineProvider>
      <DnaShipFittingCard {...props} />
    </MantineProvider>,
  );
}

describe("DnaShipFittingCard", () => {
  beforeEach(() => {
    mockUseTypes.mockReset();
  });

  it("parses the ship type id from the head of the DNA string", () => {
    // 587 = Rifter; one cargo item with no type data loaded yet.
    renderCard({ dna: "587:2605;4::::" });
    expect(screen.getByTestId("ship-type-id")).toHaveTextContent("ship-587");
  });

  it("treats items with no slot dogma effect as a single Cargo entry, preserving quantity", () => {
    // No type data => getSlotPrefix returns undefined => Cargo, qty kept.
    renderCard({ dna: "587:2605;4::::" });
    const items = screen.getAllByTestId("fitting-item");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Cargo|2605|x4");
  });

  it("expands a module's quantity into consecutive numbered slots from its dogma effect", () => {
    // effect 12 => HiSlot. quantity 3 => HiSlot0, HiSlot1, HiSlot2 (qty 1 each).
    renderCard({ dna: "587:3001;3::::" }, { 3001: typeWithEffect(3001, 12) });
    const items = screen.getAllByTestId("fitting-item");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("HiSlot0|3001|x1");
    expect(items[1]).toHaveTextContent("HiSlot1|3001|x1");
    expect(items[2]).toHaveTextContent("HiSlot2|3001|x1");
  });

  it("assigns distinct slot prefixes (med/low/rig) and counts each independently", () => {
    // 13 => MedSlot, 11 => LoSlot, 2663 => RigSlot.
    renderCard(
      { dna: "587:4001;2:5001;1:6001;2::::" },
      {
        4001: typeWithEffect(4001, 13),
        5001: typeWithEffect(5001, 11),
        6001: typeWithEffect(6001, 2663),
      },
    );
    const text = screen
      .getAllByTestId("fitting-item")
      .map((node) => node.textContent);
    expect(text).toEqual([
      "MedSlot0|4001|x1",
      "MedSlot1|4001|x1",
      "LoSlot0|5001|x1",
      "RigSlot0|6001|x1",
      "RigSlot1|6001|x1",
    ]);
  });

  it("strips the trailing '_' offline marker from a module's type id", () => {
    // "7001_" marks an offline module; the underscore must be removed before parse.
    renderCard({ dna: "587:7001_;1::::" }, { 7001: typeWithEffect(7001, 12) });
    expect(screen.getByTestId("fitting-item")).toHaveTextContent(
      "HiSlot0|7001|x1",
    );
  });

  it("skips malformed and terminator tokens without throwing", () => {
    // "garbage" has no ';' (malformed) and the trailing '::' are empty tokens.
    renderCard({ dna: "587:garbage:2605;2::::" });
    const items = screen.getAllByTestId("fitting-item");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Cargo|2605|x2");
  });

  it("forwards name and the hideHeader/hideModules flags to ShipFittingCard", () => {
    renderCard({
      dna: "587:2605;1::::",
      name: "My Rifter",
      hideHeader: true,
      hideModules: false,
    });
    expect(screen.getByTestId("ship-name")).toHaveTextContent("name-My Rifter");
    expect(screen.getByTestId("hide-flags")).toHaveTextContent(
      "header-true-modules-false",
    );
  });
});
