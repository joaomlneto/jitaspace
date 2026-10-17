import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import { DateHoverCard } from "../../DateText/DateHoverCard";

describe("DateHoverCard", () => {
  it("renders its children unwrapped without a date", () => {
    render(
      <MantineProvider>
        <DateHoverCard>
          <p>no date</p>
        </DateHoverCard>
      </MantineProvider>,
    );
    expect(screen.getByText("no date").parentElement?.tagName).not.toBe("SPAN");
  });

  // The target is a plain <span>: aria-haspopup / aria-expanded are not
  // allowed there (axe `aria-allowed-attr`).
  it("puts no popup ARIA on its span target", () => {
    render(
      <MantineProvider>
        <DateHoverCard date={new Date("2026-10-17T12:00:00Z")}>
          <p>17 Oct</p>
        </DateHoverCard>
      </MantineProvider>,
    );
    const target = screen.getByText("17 Oct").parentElement;
    expect(target?.tagName).toBe("SPAN");
    expect(target).not.toHaveAttribute("aria-haspopup");
    expect(target).not.toHaveAttribute("aria-expanded");
  });
});
