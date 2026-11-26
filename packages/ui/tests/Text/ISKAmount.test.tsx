import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import { ISKAmount } from "../../Text/ISKAmount";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("ISKAmount abbreviation", () => {
  it.each<[number, string]>([
    [0, "0"],
    [950, "950"],
    [12.34, "12.3"],
    [12_500, "12.5K"],
    [4_200_000, "4.2M"],
    [1_234_567_890, "1.2B"],
    [2.5e12, "2.5T"],
    [-350_000_000, "-350M"],
    // The unit is chosen after rounding, never "1000K" or "1000M".
    [999.96, "1K"],
    [999_950, "1M"],
    [999_999_999, "1B"],
    [-999_950, "-1M"],
    // Below 1 ISK the decimals are kept rather than shown as 0.
    [0.5, "0.5"],
    [0.04, "0"],
  ])("renders %p as %s ISK", (amount, expected) => {
    renderWithMantine(<ISKAmount amount={amount} />);
    expect(screen.getByText(`${expected} ISK`)).toBeInTheDocument();
  });

  it("honours digits when choosing the unit", () => {
    renderWithMantine(<ISKAmount amount={999_950} digits={2} />);
    expect(screen.getByText("999.95K ISK")).toBeInTheDocument();
  });
});
