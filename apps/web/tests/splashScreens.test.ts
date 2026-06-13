import { describe, expect, it } from "@jest/globals";

import { splashScreenLink, splashScreens } from "~/app/splashScreens";

describe("iOS splash screens", () => {
  it("declares a non-empty, uniquely-named set", () => {
    expect(splashScreens.length).toBeGreaterThan(0);
    const names = splashScreens.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("builds an apple-touch-startup-image link for each device", () => {
    for (const screen of splashScreens) {
      const { href, media } = splashScreenLink(screen);
      expect(href).toBe(`/splash/${screen.name}.png`);
      expect(media).toContain(`(device-width: ${screen.width}px)`);
      expect(media).toContain(`(device-height: ${screen.height}px)`);
      expect(media).toContain(`(-webkit-device-pixel-ratio: ${screen.ratio})`);
      expect(media).toContain("(orientation: portrait)");
    }
  });
});
