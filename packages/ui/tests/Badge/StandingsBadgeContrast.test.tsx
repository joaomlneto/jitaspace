import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";

import { StandingsBadge } from "../../Badge/StandingsBadge";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const badgeStyle = (container: HTMLElement) =>
  container.querySelector<HTMLElement>(".mantine-Badge-root")?.style;

// --- WCAG 2.1 relative luminance / contrast ratio -------------------------
const channel = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a: string, b: string) => {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const AA_NORMAL_TEXT = 4.5;
const BLACK = "#000000";
const WHITE = "#ffffff";

// The tier backgrounds, straight from StandingsBadge.
const DARK_BLUE = "#051468";
const LIGHT_BLUE = "#224fb7";
const GREY = "#808080";
const ORANGE = "#b53209";
const RED = "#800007";

describe("standings tier contrast", () => {
  it("sanity-checks the contrast helper against known values", () => {
    expect(contrast(BLACK, WHITE)).toBeCloseTo(21, 1);
    expect(contrast(WHITE, WHITE)).toBeCloseTo(1, 5);
  });

  // Regression: orange and red forced `color: theme.black`, measuring 3.4:1 and
  // 1.9:1 — both under AA. These assertions are why the override was dropped.
  it.each([
    ["orange", ORANGE],
    ["red", RED],
  ])("cannot use black text on the %s tier", (_name, background) => {
    expect(contrast(BLACK, background)).toBeLessThan(AA_NORMAL_TEXT);
  });

  it.each([
    ["dark blue", DARK_BLUE],
    ["light blue", LIGHT_BLUE],
    ["orange", ORANGE],
    ["red", RED],
  ])("clears AA with light text on the %s tier", (_name, background) => {
    expect(contrast(WHITE, background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("keeps black on the grey tier, where it is the better of the two", () => {
    expect(contrast(BLACK, GREY)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    expect(contrast(BLACK, GREY)).toBeGreaterThan(contrast(WHITE, GREY));
  });
});

describe("StandingsBadge rendering", () => {
  // Only the grey tier may pin a text colour; the rest inherit the badge's
  // light filled-variant text, which is what the ratios above require.
  it.each<[number, string, boolean]>([
    [8, "rgb(5, 20, 104)", false],
    [3, "rgb(34, 79, 183)", false],
    [0, "rgb(128, 128, 128)", true],
    [-3, "rgb(181, 50, 9)", false],
    [-8, "rgb(128, 0, 7)", false],
  ])("standing %p", (standing, background, pinsBlackText) => {
    const { container } = renderWithMantine(
      <StandingsBadge standing={standing} />,
    );
    const style = badgeStyle(container);
    expect(style?.backgroundColor).toBe(background);
    expect(style?.color).toBe(pinsBlackText ? "rgb(0, 0, 0)" : "");
  });
});
