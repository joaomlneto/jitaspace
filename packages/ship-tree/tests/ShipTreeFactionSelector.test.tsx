import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { SHIP_TREE_FACTIONS } from "../factions";
import { ShipTreeFactionSelector } from "../ShipTreeFactionSelector";

const AMARR = 500003;
const CALDARI = 500001;

describe("ShipTreeFactionSelector", () => {
  it("offers every faction, in our alphabetical order", () => {
    render(<ShipTreeFactionSelector value={CALDARI} onChange={jest.fn()} />);

    const group = screen.getByRole("radiogroup", { name: "Faction" });
    const options = within(group).getAllByRole("radio");
    expect(
      options.map((option) => option.getAttribute("data-faction")),
    ).toEqual(SHIP_TREE_FACTIONS.map((faction) => String(faction.id)));
  });

  it("marks the chosen faction", () => {
    render(<ShipTreeFactionSelector value={CALDARI} onChange={jest.fn()} />);

    const checked = screen
      .getAllByRole("radio")
      .filter((option) => option.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAttribute("data-faction", String(CALDARI));
  });

  it("reports the faction clicked by its id", () => {
    const onChange = jest.fn();
    render(<ShipTreeFactionSelector value={CALDARI} onChange={onChange} />);

    const amarr = screen
      .getAllByRole("radio")
      .find((option) => option.getAttribute("data-faction") === String(AMARR));
    expect(amarr).toBeDefined();
    fireEvent.click(amarr!);
    expect(onChange).toHaveBeenCalledWith(AMARR);
  });

  it("still lets the caller pick its own list", () => {
    render(
      <ShipTreeFactionSelector
        value={AMARR}
        onChange={jest.fn()}
        factions={[AMARR, CALDARI]}
      />,
    );

    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });
});
