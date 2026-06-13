import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import {
  DogmaAttributeValue,
  formatDogmaAttributeValue,
} from "../../Text/DogmaAttributeValue";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("formatDogmaAttributeValue", () => {
  // The unit-id transforms mirror the EVE client. Values are kept free of
  // thousands separators so the assertions stay locale-independent.
  it.each<
    [string, number, { unitId?: number; symbol?: string } | undefined, string]
  >([
    ["resistance (inverse percent, unit 108)", 0.25, { unitId: 108 }, "75%"],
    ["absolute percent (unit 127)", 0.5, { unitId: 127 }, "50%"],
    ["positive modifier percent (unit 109)", 1.1, { unitId: 109 }, "+10%"],
    ["negative modifier percent (unit 109)", 0.9, { unitId: 109 }, "-10%"],
    ["boolean true (unit 137)", 1, { unitId: 137 }, "Yes"],
    ["boolean false (unit 137)", 0, { unitId: 137 }, "No"],
    ["plain unit with m3 prettified to m³", 100, { symbol: "m3" }, "100 m³"],
    ["percent symbol unit", 5, { symbol: "%" }, "5%"],
    ["bare value with no unit", 42, undefined, "42"],
  ])("formats %s", (_label, value, unit, expected) => {
    expect(formatDogmaAttributeValue(value, unit)).toBe(expected);
  });
});

describe("DogmaAttributeValue", () => {
  it("renders the value transformed for its unit id", () => {
    renderWithMantine(<DogmaAttributeValue value={0.25} unitId={108} />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("appends the prettified unit symbol for plain units", () => {
    renderWithMantine(<DogmaAttributeValue value={100} unitSymbol="m3" />);
    expect(screen.getByText("100 m³")).toBeInTheDocument();
  });

  it("renders a skeleton placeholder when the value is missing", () => {
    renderWithMantine(<DogmaAttributeValue data-testid="dav" />);
    const text = screen.getByTestId("dav");
    expect(text).toBeInTheDocument();
    expect(text.querySelector("span")).toBeInTheDocument();
  });
});
