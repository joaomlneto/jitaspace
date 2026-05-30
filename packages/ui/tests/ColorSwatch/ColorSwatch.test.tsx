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

  it("falls back to the 'primary' color when none is provided", () => {
    const { container } = renderWithMantine(<MailLabelColorSwatch />);
    const swatch = container.querySelector(".mantine-ColorSwatch-root");
    expect(swatch).toBeInTheDocument();
    // The non-theme "primary" fallback string is passed through verbatim
    expect(colorOverlayOf(container)).toHaveStyle({
      backgroundColor: "primary",
    });
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
