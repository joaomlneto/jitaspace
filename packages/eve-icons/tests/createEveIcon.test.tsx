import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import type { EveIconDefinition } from "../src/createEveIcon";
import {
  createEveIcon,
  pickSource,
  pickWidth,
  resolveSize,
  tintStyle,
} from "../src/createEveIcon";

const src = (width: number) => `data:image/png;base64,${width}`;

const glyph: EveIconDefinition = {
  id: "system/arrow-down",
  label: "Arrow down",
  monochrome: true,
  sources: [
    { width: 16, height: 16, src: src(16), path: "res:/x.png" },
    { width: 32, height: 32, src: src(32), path: "res:/x.png" },
    { width: 64, height: 64, src: src(64), path: "res:/x.png" },
  ],
};

const colourful: EveIconDefinition = {
  id: "window/calendar",
  label: "Calendar",
  monochrome: false,
  sources: [{ width: 64, height: 65, src: src(64), path: "res:/x.png" }],
};

describe("pickSource", () => {
  it("picks the smallest size that is sharp at 2x", () => {
    expect(pickSource(glyph.sources, 8).width).toBe(16);
    expect(pickSource(glyph.sources, 9).width).toBe(32);
    expect(pickSource(glyph.sources, 16).width).toBe(32);
    expect(pickSource(glyph.sources, 32).width).toBe(64);
  });

  it("falls back to the largest size", () => {
    expect(pickSource(glyph.sources, 200).width).toBe(64);
    expect(pickSource(glyph.sources, undefined).width).toBe(64);
  });
});

describe("pickWidth", () => {
  it("applies the same rule to bare widths", () => {
    expect(pickWidth([16, 32, 64], 16)).toBe(32);
    expect(pickWidth([16, 32, 64], undefined)).toBe(64);
  });

  it("rejects an icon without sizes", () => {
    expect(() => pickWidth([], 16)).toThrow("at least one size");
  });
});

describe("tintStyle", () => {
  it("paints the colour through the image as a mask", () => {
    expect(tintStyle("x.png", "red")).toEqual({
      backgroundColor: "red",
      mask: 'url("x.png") center / contain no-repeat',
      WebkitMask: 'url("x.png") center / contain no-repeat',
    });
  });
});

describe("resolveSize", () => {
  it("defaults to the smallest native size", () => {
    expect(resolveSize(glyph, {})).toEqual({ width: 16, height: 16 });
  });

  it("uses size, keeping the aspect ratio", () => {
    expect(resolveSize(colourful, { size: 128 })).toEqual({
      width: 128,
      height: 130,
    });
  });

  it("derives the missing side from width or height", () => {
    expect(resolveSize(colourful, { width: 32 })).toEqual({
      width: 32,
      height: 32.5,
    });
    expect(resolveSize(colourful, { height: "65" })).toEqual({
      width: 64,
      height: 65,
    });
  });

  it("lets explicit width and height override size", () => {
    expect(resolveSize(glyph, { size: 10, width: 20, height: 30 })).toEqual({
      width: 20,
      height: 30,
    });
  });
});

describe("createEveIcon", () => {
  const Glyph = createEveIcon(glyph);
  const Colourful = createEveIcon(colourful);

  it("exposes its definition and a display name", () => {
    expect(Glyph.icon).toBe(glyph);
    expect(Glyph.displayName).toBe("system/arrow-down");
  });

  it("renders an <img> labelled with the icon name", () => {
    render(<Glyph size={16} />);
    const img = screen.getByRole("img", { name: "Arrow down" });
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("src", src(32));
    expect(img).toHaveAttribute("width", "16");
    expect(img).toHaveAttribute("height", "16");
  });

  it("passes <img> attributes through and honours alt", () => {
    render(<Colourful width={32} alt="Events" className="x" loading="lazy" />);
    const img = screen.getByRole("img", { name: "Events" });
    expect(img).toHaveClass("x");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("height", "32.5");
  });

  it("fills its parent when asked", () => {
    render(<Colourful fill alt="" style={{ objectFit: "contain" }} />);
    const img = document.querySelector("img")!;
    expect(img).not.toHaveAttribute("width");
    expect(img.style.position).toBe("absolute");
    expect(img.style.width).toBe("100%");
    expect(img.style.objectFit).toBe("contain");
    expect(img).toHaveAttribute("src", src(64));
  });

  it("tints a monochrome icon with a mask", () => {
    render(<Glyph size={24} color="red" loading="lazy" title="Down" />);
    const span = screen.getByRole("img", { name: "Arrow down" });
    expect(span.tagName).toBe("SPAN");
    expect(span).toHaveAttribute("title", "Down");
    expect(span).not.toHaveAttribute("loading");
    expect(span.style.backgroundColor).toBe("red");
    expect(span.style.width).toBe("24px");
    expect(span.getAttribute("style")).toContain(src(64));
  });

  it("hides a decorative tinted icon from assistive technology", () => {
    render(<Glyph color="currentColor" alt="" />);
    const span = document.querySelector("span")!;
    expect(span).toHaveAttribute("aria-hidden", "true");
    expect(span).not.toHaveAttribute("role");
  });

  it("ignores color on a full-colour icon", () => {
    render(<Colourful color="red" />);
    expect(screen.getByRole("img", { name: "Calendar" }).tagName).toBe("IMG");
  });
});
