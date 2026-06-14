/**
 * Covers the PWA web app manifest. Beyond raising coverage, these assertions
 * pin the install-experience contract: a stable identity, the desktop
 * window-controls-overlay opt-in, maskable icons, and install screenshots for
 * both form factors.
 */

import { describe, expect, it } from "@jest/globals";

import manifest from "~/app/manifest";

describe("web app manifest", () => {
  const result = manifest();

  it("uses a stable identity with a matching start_url", () => {
    expect(result.id).toBe("/?source=pwa");
    expect(result.start_url).toBe(result.id);
  });

  it("opts into the native desktop title bar with a standalone fallback", () => {
    expect(result.display).toBe("standalone");
    expect(result.display_override).toEqual([
      "window-controls-overlay",
      "standalone",
    ]);
  });

  it("matches theme and background to the dark header background", () => {
    expect(result.theme_color).toBe("#04070c");
    expect(result.background_color).toBe("#04070c");
  });

  it("provides maskable icons alongside the standard icons", () => {
    const maskable = (result.icons ?? []).filter(
      (icon) => icon.purpose === "maskable",
    );
    expect(maskable.map((icon) => icon.sizes)).toEqual(["192x192", "512x512"]);
    expect(maskable.every((icon) => icon.src.includes("maskable"))).toBe(true);

    const standard = (result.icons ?? []).filter(
      (icon) => icon.purpose !== "maskable",
    );
    expect(standard.length).toBeGreaterThan(0);
  });

  it("declares wide and narrow install screenshots", () => {
    const formFactors = (result.screenshots ?? []).map(
      (shot) => shot.form_factor,
    );
    expect(formFactors).toEqual(["wide", "narrow"]);
  });

  it("exposes app shortcuts, each tagged for analytics", () => {
    const shortcuts = result.shortcuts ?? [];
    expect(shortcuts.length).toBeGreaterThan(0);

    // Search must be reachable from the jump list.
    expect(shortcuts.map((s) => s.name)).toContain("Search");

    // Every shortcut points at an in-app route tagged as a PWA shortcut.
    for (const shortcut of shortcuts) {
      expect(shortcut.url.startsWith("/")).toBe(true);
      expect(shortcut.url).toContain("?source=pwa-shortcut");
    }
  });
});
