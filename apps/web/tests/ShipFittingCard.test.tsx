import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import type { ShipFittingCardProps } from "~/components/Fitting/ShipFittingCard/ShipFittingCard";

// ---------------------------------------------------------------------------
// ShipFittingCard is presentational: it buckets `items` by their slot `flag`
// (HiSlot/MedSlot/LoSlot/RigSlot/SubSystemSlot/ServiceSlot/DroneBay/FighterBay/
// Cargo/Invalid), then renders a ShipFittingCardHeader and one
// ShipFittingCardModulesSection per non-empty bucket. We stub those two
// children with tiny inspectors so we can assert which sections/headers were
// produced (and the header gating via hideHeader/hideModules) without dragging
// in @jitaspace/ui clipboard/avatar internals.
// ---------------------------------------------------------------------------

jest.mock(
  "~/components/Fitting/ShipFittingCard/ShipFittingCardHeader",
  () => {
    const React = require("react");
    return {
      ShipFittingCardHeader: ({
        shipName,
        shipTypeId,
      }: {
        shipName?: string;
        shipTypeId?: number;
      }) =>
        React.createElement(
          "div",
          { "data-testid": "fitting-header" },
          `header:${shipName ?? "none"}:${shipTypeId ?? "none"}`,
        ),
    };
  },
);

jest.mock(
  "~/components/Fitting/ShipFittingCard/ShipFittingCardModulesSection",
  () => {
    const React = require("react");
    return {
      ShipFittingCardModulesSection: ({
        header,
        items,
      }: {
        header: string;
        items: { typeId: number }[];
      }) =>
        React.createElement(
          "div",
          { "data-testid": "modules-section" },
          `${header}=${items.map((i) => i.typeId).join(",")}`,
        ),
    };
  },
);

function renderCard(props: Partial<ShipFittingCardProps> & { items: ShipFittingCardProps["items"] }) {
  const {
    ShipFittingCard,
  } = require("~/components/Fitting/ShipFittingCard/ShipFittingCard");
  return render(
    <MantineProvider>
      <ShipFittingCard {...props} />
    </MantineProvider>,
  );
}

// A fitting touching every slot bucket plus an out-of-order pair to exercise
// the localeCompare sort inside each section.
const FULL_ITEMS: ShipFittingCardProps["items"] = [
  { flag: "HiSlot1", typeId: 101, quantity: 1 },
  { flag: "HiSlot0", typeId: 100, quantity: 1 },
  { flag: "MedSlot0", typeId: 200, quantity: 1 },
  { flag: "LoSlot0", typeId: 300, quantity: 1 },
  { flag: "RigSlot0", typeId: 400, quantity: 1 },
  { flag: "SubSystemSlot0", typeId: 500, quantity: 1 },
  { flag: "ServiceSlot0", typeId: 600, quantity: 1 },
  { flag: "DroneBay", typeId: 700, quantity: 5 },
  { flag: "FighterBay", typeId: 800, quantity: 2 },
  { flag: "Cargo", typeId: 900, quantity: 10 },
  { flag: "Invalid", typeId: 999, quantity: 1 },
] as ShipFittingCardProps["items"];

describe("ShipFittingCard", () => {
  it("renders the header by default with the ship name and type id", () => {
    renderCard({ name: "My Rifter", shipTypeId: 587, items: [] });
    expect(screen.getByTestId("fitting-header")).toHaveTextContent(
      "header:My Rifter:587",
    );
  });

  it("renders no module sections when items is empty", () => {
    renderCard({ name: "Empty", shipTypeId: 587, items: [] });
    expect(screen.queryByTestId("modules-section")).not.toBeInTheDocument();
  });

  it("renders one section per non-empty slot bucket with the right header labels", () => {
    renderCard({ name: "Loaded", shipTypeId: 587, items: FULL_ITEMS });
    const sections = screen
      .getAllByTestId("modules-section")
      .map((node) => node.textContent);
    // All ten buckets have an item -> ten sections in declaration order.
    expect(sections).toHaveLength(10);
    expect(sections[0]).toContain("High Slots=");
    expect(sections[1]).toContain("Mid Slots=");
    expect(sections[2]).toContain("Low Slots=");
    expect(sections[3]).toContain("Rigs=");
    expect(sections[4]).toContain("Subsystems=");
    expect(sections[5]).toContain("Service Slots=");
    expect(sections[6]).toContain("Drone Bay=");
    expect(sections[7]).toContain("Fighter Bay=");
    expect(sections[8]).toContain("Cargohold=");
    expect(sections[9]).toContain("Invalid=");
  });

  it("sorts items within a slot bucket by their flag (localeCompare)", () => {
    renderCard({
      shipTypeId: 587,
      items: [
        { flag: "HiSlot1", typeId: 101, quantity: 1 },
        { flag: "HiSlot0", typeId: 100, quantity: 1 },
      ] as ShipFittingCardProps["items"],
    });
    // HiSlot0 (type 100) sorts before HiSlot1 (type 101).
    expect(screen.getByTestId("modules-section")).toHaveTextContent(
      "High Slots=100,101",
    );
  });

  it("hides the header when hideHeader is set", () => {
    renderCard({
      name: "Hidden",
      shipTypeId: 587,
      hideHeader: true,
      items: [{ flag: "HiSlot0", typeId: 100, quantity: 1 }] as ShipFittingCardProps["items"],
    });
    expect(screen.queryByTestId("fitting-header")).not.toBeInTheDocument();
    // modules still render
    expect(screen.getByTestId("modules-section")).toBeInTheDocument();
  });

  it("hides the module sections when hideModules is set", () => {
    renderCard({
      name: "NoModules",
      shipTypeId: 587,
      hideModules: true,
      items: FULL_ITEMS,
    });
    expect(screen.getByTestId("fitting-header")).toBeInTheDocument();
    expect(screen.queryByTestId("modules-section")).not.toBeInTheDocument();
  });
});
