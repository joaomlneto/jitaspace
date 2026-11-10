import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react";

import { jitaSpaceApps } from "~/config/apps";

// ---------------------------------------------------------------------------
// The About menu's Discord entry shows Discord's own logo among EVE icons. It
// must fill the same square box the menus give an EVE icon, draw the glyph at
// three-quarters of it (EVE artwork covers only ~2/3 of its square, Tabler's
// logo nearly all of it), and take the surrounding text colour rather than a
// brand colour, like the footer's Discord button.
// ---------------------------------------------------------------------------

const discord = jitaSpaceApps.discord;
if (!discord) throw new Error("jitaSpaceApps.discord is missing");
const DiscordIcon = discord.Icon;

function renderLogo(props: Parameters<typeof DiscordIcon>[0]) {
  const { container } = render(<DiscordIcon {...props} />);
  const box = container.firstElementChild as HTMLElement;
  const svg = box.querySelector("svg");
  if (!svg) throw new Error("no svg rendered");
  return { box, svg };
}

describe("Discord logo in the About menu", () => {
  it("fills the menu's icon box and draws the logo at three-quarters of it", () => {
    const { box, svg } = renderLogo({ width: 20, alt: "" });

    expect(box).toHaveStyle({ width: "20px", height: "20px" });
    expect(svg).toHaveAttribute("width", "15");
    expect(svg).toHaveAttribute("height", "15");
  });

  it("sizes from size, then width, then height", () => {
    expect(renderLogo({ size: 32, width: 20 }).box).toHaveStyle({
      width: "32px",
    });
    expect(renderLogo({ height: 24 }).svg).toHaveAttribute("width", "18");
  });

  it("falls back to a 24px box when no size is given", () => {
    const { box, svg } = renderLogo({});

    expect(box).toHaveStyle({ width: "24px", height: "24px" });
    expect(svg).toHaveAttribute("width", "18");
  });

  it("uses the surrounding text colour, not Discord blue", () => {
    const { svg } = renderLogo({ width: 20 });

    expect(svg).toHaveAttribute("fill", "currentColor");
    expect(svg.outerHTML).not.toMatch(/5865f2/i);
  });

  it("is hidden from assistive technology, since the entry is labelled", () => {
    const { box } = renderLogo({ width: 20 });

    expect(box).toHaveAttribute("aria-hidden", "true");
  });
});
