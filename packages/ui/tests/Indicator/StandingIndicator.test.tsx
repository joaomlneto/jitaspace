import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";

import type * as StandingIndicatorModule from "../../Indicator/StandingIndicator/StandingIndicator";

// StandingIndicator imports five binary .gif files and next/image. Jest cannot
// transform the binary .gif assets, so stub each one (the StaticImageData shape
// Next expects) and replace next/image with a plain <img>. Mocked relative to
// the component's own location (../../Indicator/StandingIndicator/<file>).
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt }: { src: unknown; alt?: string }) => {
    const resolved =
      typeof src === "string"
        ? src
        : ((src as { src?: string } | null)?.src ?? "");
    return <img src={resolved} alt={alt} />;
  },
}));

const stubGif = (name: string) => ({
  __esModule: true,
  default: { src: `/${name}.gif`, height: 16, width: 16 },
});

jest.mock(
  "../../Indicator/StandingIndicator/ColorTagMinusOrange.gif",
  () => stubGif("ColorTagMinusOrange"),
  { virtual: true },
);
jest.mock(
  "../../Indicator/StandingIndicator/ColorTagMinusRed.gif",
  () => stubGif("ColorTagMinusRed"),
  { virtual: true },
);
jest.mock(
  "../../Indicator/StandingIndicator/ColorTagNeutral.gif",
  () => stubGif("ColorTagNeutral"),
  { virtual: true },
);
jest.mock(
  "../../Indicator/StandingIndicator/ColorTagPlusDarkBlue.gif",
  () => stubGif("ColorTagPlusDarkBlue"),
  { virtual: true },
);
jest.mock(
  "../../Indicator/StandingIndicator/ColorTagPlusLightBlue.gif",
  () => stubGif("ColorTagPlusLightBlue"),
  { virtual: true },
);

const { StandingIndicator } =
  require("../../Indicator/StandingIndicator/StandingIndicator") as typeof StandingIndicatorModule;

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const indicatorDot = (container: HTMLElement) =>
  container.querySelector(".mantine-Indicator-indicator");

const standingImgSrc = (container: HTMLElement) =>
  container.querySelector("img")?.getAttribute("src") ?? "";

describe("StandingIndicator", () => {
  it("is disabled (no dot) when standing is undefined", () => {
    const { container } = renderWithMantine(
      <StandingIndicator>
        <span>avatar</span>
      </StandingIndicator>,
    );
    // standing === undefined -> Indicator disabled -> no dot rendered
    expect(indicatorDot(container)).not.toBeInTheDocument();
  });

  // getStandingImage branches on the standing value ranges.
  it.each<[string, number, string]>([
    ["dark blue for excellent standing (> 5)", 7, "ColorTagPlusDarkBlue"],
    ["light blue for good standing (0 < s <= 5)", 3, "ColorTagPlusLightBlue"],
    ["neutral for zero standing", 0, "ColorTagNeutral"],
    ["orange for bad standing (-5 <= s < 0)", -3, "ColorTagMinusOrange"],
    ["red for terrible standing (< -5)", -8, "ColorTagMinusRed"],
  ])("renders the %s", (_label, standing, expectedGif) => {
    const { container } = renderWithMantine(
      <StandingIndicator standing={standing}>
        <span>avatar</span>
      </StandingIndicator>,
    );
    // A defined standing enables the indicator dot...
    expect(indicatorDot(container)).toBeInTheDocument();
    // ...and the resolved standing image points at the right gif.
    expect(standingImgSrc(container)).toContain(expectedGif);
  });

  it("renders the boundary standing of exactly 5 as light blue (not dark)", () => {
    const { container } = renderWithMantine(
      <StandingIndicator standing={5}>
        <span>avatar</span>
      </StandingIndicator>,
    );
    expect(standingImgSrc(container)).toContain("ColorTagPlusLightBlue");
  });

  it("renders the boundary standing of exactly -5 as orange (not red)", () => {
    const { container } = renderWithMantine(
      <StandingIndicator standing={-5}>
        <span>avatar</span>
      </StandingIndicator>,
    );
    expect(standingImgSrc(container)).toContain("ColorTagMinusOrange");
  });

  it("forwards extra Indicator props (e.g. size) to the underlying Indicator", () => {
    const { container } = renderWithMantine(
      <StandingIndicator standing={1} size={24}>
        <span>avatar</span>
      </StandingIndicator>,
    );
    expect(
      container.querySelector(".mantine-Indicator-root"),
    ).toBeInTheDocument();
    expect(indicatorDot(container)).toBeInTheDocument();
  });
});
