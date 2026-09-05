import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";

import { MailLabelColorSwatch } from "../../ColorSwatch/MailLabelColorSwatch";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

// Mantine paints the color onto a child overlay element as background-color.
const colorOverlayOf = (container: HTMLElement) =>
  container.querySelector(".mantine-ColorSwatch-colorOverlay");

describe("MailLabelColorSwatch", () => {
  it("renders a swatch for the provided color", () => {
    const { container } = renderWithMantine(
      <MailLabelColorSwatch color="#ff6600" />,
    );
    const swatch = container.querySelector(".mantine-ColorSwatch-root");
    expect(swatch).toBeInTheDocument();
    // #ff6600 is normalized to its rgb() form by jsdom's style engine
    expect(colorOverlayOf(container)).toHaveStyle({
      backgroundColor: "rgb(255, 102, 0)",
    });
  });

  it("falls back to a real colour when none is provided", () => {
    const { container } = renderWithMantine(<MailLabelColorSwatch />);
    const swatch = container.querySelector(".mantine-ColorSwatch-root");
    expect(swatch).toBeInTheDocument();

    // Regression: the fallback used to be a bare "primary", which is neither a
    // CSS colour keyword nor a Mantine theme key — so the declaration was
    // dropped and the swatch rendered with no colour at all. Asserted on the
    // style attribute rather than through toHaveStyle: jsdom discards an
    // invalid declaration, and jest-dom parses the *expected* value the same
    // way, so `toHaveStyle({ backgroundColor: "primary" })` compared empty to
    // empty and passed against the broken component.
    const style = colorOverlayOf(container)?.getAttribute("style") ?? "";
    expect(style).toContain("background-color:");
    expect(style).toContain("var(--mantine-primary-color-filled)");
  });

  it("forwards extra ColorSwatch props (size/other)", () => {
    const { container } = renderWithMantine(
      <MailLabelColorSwatch color="#0099ff" size={40} data-testid="swatch" />,
    );
    const swatch = container.querySelector('[data-testid="swatch"]');
    expect(swatch).toBeInTheDocument();
    expect(colorOverlayOf(container)).toHaveStyle({
      backgroundColor: "rgb(0, 153, 255)",
    });
  });
});
