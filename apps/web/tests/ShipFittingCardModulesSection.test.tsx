import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { Card, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// ShipFittingCardModulesSection renders a header label, one
// ShipFittingCardModuleSectionEntry per item, and (conditionally) an
// empty-slot count or a "Too many modules" warning derived from `numSlots`
// vs the summed item quantities. We stub the entry child with an inspector so
// we can count rendered entries and assert the remaining-slot math drives the
// right branch.
// ---------------------------------------------------------------------------

jest.mock(
  "~/components/Fitting/ShipFittingCard/ShipFittingCardModuleSectionEntry",
  () => {
    const React = require("react");
    return {
      ShipFittingCardModuleSectionEntry: ({
        typeId,
        quantity,
      }: {
        typeId: number;
        quantity?: number;
      }) =>
        React.createElement(
          "div",
          { "data-testid": "module-entry" },
          `entry:${typeId}:x${quantity ?? 1}`,
        ),
    };
  },
);

type SectionItem = {
  typeId: number;
  quantity?: number;
  ammo?: { typeId?: number; quantity: number };
};

function renderSection(props: {
  header: string;
  items: SectionItem[];
  numSlots?: number;
  showEmptySlots?: boolean;
  showExcessModules?: boolean;
}) {
  const {
    ShipFittingCardModulesSection,
  } = require("~/components/Fitting/ShipFittingCard/ShipFittingCardModulesSection");
  // The section renders a <Card.Section>, which requires a <Card> ancestor.
  return render(
    <MantineProvider>
      <Card>
        <ShipFittingCardModulesSection {...props} />
      </Card>
    </MantineProvider>,
  );
}

describe("ShipFittingCardModulesSection", () => {
  it("renders the header label and one entry per item", () => {
    renderSection({
      header: "High Slots",
      items: [{ typeId: 100 }, { typeId: 101, quantity: 2 }],
    });
    expect(screen.getByText("High Slots")).toBeInTheDocument();
    const entries = screen.getAllByTestId("module-entry");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveTextContent("entry:100:x1");
    expect(entries[1]).toHaveTextContent("entry:101:x2");
  });

  it("shows the remaining empty-slot count when showEmptySlots and slots are free", () => {
    // numSlots 5, one module of quantity 2 used -> 3 empty slots.
    renderSection({
      header: "Mid Slots",
      items: [{ typeId: 200, quantity: 2 }],
      numSlots: 5,
      showEmptySlots: true,
    });
    expect(screen.getByText("3 Empty Slots")).toBeInTheDocument();
    expect(screen.queryByText("Too many modules")).not.toBeInTheDocument();
  });

  it("does not show empty-slot text when there are no free slots", () => {
    // numSlots 2, items summing to exactly 2 -> remainingSlots 0, no text.
    renderSection({
      header: "Low Slots",
      items: [{ typeId: 300 }, { typeId: 301 }],
      numSlots: 2,
      showEmptySlots: true,
    });
    expect(screen.queryByText(/Empty Slots/)).not.toBeInTheDocument();
  });

  it("warns about too many modules when showExcessModules and slots are overfilled", () => {
    // numSlots 1, items summing to 3 -> remainingSlots -2 -> warning.
    renderSection({
      header: "Rigs",
      items: [{ typeId: 400 }, { typeId: 401 }, { typeId: 402 }],
      numSlots: 1,
      showExcessModules: true,
    });
    expect(screen.getByText("Too many modules")).toBeInTheDocument();
    expect(screen.queryByText(/Empty Slots/)).not.toBeInTheDocument();
  });

  it("omits both warnings when neither flag is set even if slots differ", () => {
    renderSection({
      header: "Cargohold",
      items: [{ typeId: 900, quantity: 1 }],
      numSlots: 10,
    });
    expect(screen.queryByText(/Empty Slots/)).not.toBeInTheDocument();
    expect(screen.queryByText("Too many modules")).not.toBeInTheDocument();
    expect(screen.getByTestId("module-entry")).toHaveTextContent("entry:900:x1");
  });
});
