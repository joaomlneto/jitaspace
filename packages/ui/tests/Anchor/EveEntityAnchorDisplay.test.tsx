import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import { EveEntityAnchorDisplay } from "../../Anchor/EveEntityAnchorDisplay";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("EveEntityAnchorDisplay", () => {
  it("renders an anchor whose href matches the passed href", () => {
    renderWithMantine(
      <EveEntityAnchorDisplay href="/character/90000001">
        Some Pilot
      </EveEntityAnchorDisplay>,
    );
    const anchor = screen.getByText("Some Pilot").closest("a");
    expect(anchor).toBeInTheDocument();
    expect(anchor).toHaveAttribute("href", "/character/90000001");
  });

  it("renders its children", () => {
    renderWithMantine(
      <EveEntityAnchorDisplay href="/region/10000002">
        The Forge
      </EveEntityAnchorDisplay>,
    );
    expect(screen.getByText("The Forge")).toBeInTheDocument();
  });

  it("renders element children inside the anchor", () => {
    renderWithMantine(
      <EveEntityAnchorDisplay href="/type/587">
        <span data-testid="child">Rifter</span>
      </EveEntityAnchorDisplay>,
    );
    const child = screen.getByTestId("child");
    expect(child).toBeInTheDocument();
    expect(child.closest("a")).toHaveAttribute("href", "/type/587");
  });
});
