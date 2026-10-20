import "@testing-library/jest-dom/jest-globals";

import type { ImgHTMLAttributes } from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import type { JitaSpaceIcon as JitaSpaceIconComponent } from "~/components/Icon/JitaSpaceIcon";

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    <img alt={props.alt} {...props} />
  ),
}));

function renderIcon(props: Parameters<typeof JitaSpaceIconComponent>[0]) {
  const { JitaSpaceIcon } = require("~/components/Icon/JitaSpaceIcon") as {
    JitaSpaceIcon: typeof JitaSpaceIconComponent;
  };
  render(<JitaSpaceIcon {...props} />);
  return screen.getByRole("img");
}

describe("JitaSpaceIcon", () => {
  it("shows the small logo, named JitaSpace", () => {
    const img = renderIcon({ width: 20 });
    expect(img).toHaveAttribute("src", "/logo-small.svg");
    expect(img).toHaveAttribute("alt", "JitaSpace");
  });

  it("keeps the logo's 176:168 shape when only a width is given", () => {
    expect(renderIcon({ width: 20 })).toHaveAttribute("height", "19");
  });

  it("accepts a width given as a string", () => {
    expect(renderIcon({ width: "88" })).toHaveAttribute("height", "84");
  });

  it("defaults to the logo's own size", () => {
    const img = renderIcon({});
    expect(img).toHaveAttribute("width", "176");
    expect(img).toHaveAttribute("height", "168");
  });

  it("uses an explicit height and alt text as given", () => {
    const img = renderIcon({ width: 32, height: 32, alt: "Home" });
    expect(img).toHaveAttribute("height", "32");
    expect(img).toHaveAttribute("alt", "Home");
  });
});
