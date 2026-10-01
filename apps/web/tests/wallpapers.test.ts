import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "@jest/globals";
import { DEFAULT_THEME, mergeMantineTheme } from "@mantine/core";

import { themes } from "~/themes";
import { WALLPAPERS } from "~/themes/wallpapers";

const PUBLIC = join(__dirname, "..", "public");
const urlOf = (background: string) =>
  /url\(([^)]+)\)/.exec(background)?.[1] ?? "";

// A phone downloads one of these on every cold load of every page.
const MOBILE_BUDGET_BYTES = 150 * 1024;

describe("wallpapers", () => {
  const entries = Object.entries(WALLPAPERS);

  it.each(entries)("%s: both files exist", (_, wallpaper) => {
    for (const background of [
      wallpaper.appBackground,
      wallpaper.appBackgroundMobile,
    ]) {
      const url = urlOf(background);
      expect(url).toMatch(/^\/wallpapers\//);
      expect(existsSync(join(PUBLIC, url))).toBe(true);
    }
  });

  it.each(entries)("%s: the mobile copy is a small WebP", (_, wallpaper) => {
    const url = urlOf(wallpaper.appBackgroundMobile);
    expect(url).toMatch(/-mobile\.webp$/);
    const bytes = statSync(join(PUBLIC, url)).size;
    expect(bytes).toBeLessThan(MOBILE_BUDGET_BYTES);
    expect(bytes).toBeLessThan(
      statSync(join(PUBLIC, urlOf(wallpaper.appBackground))).size / 3,
    );
  });
});

describe("theme backgrounds", () => {
  it.each(Object.entries(themes))(
    "%s: a mobile background goes with every desktop one",
    (_, theme) => {
      const { appBackground, appBackgroundMobile } = mergeMantineTheme(
        DEFAULT_THEME,
        theme,
      ).other;
      expect(Boolean(appBackgroundMobile)).toBe(Boolean(appBackground));
      // Same wallpaper, not a stale one inherited from a parent theme: a solid
      // colour has no file to compare, so it must simply be the same colour.
      if (appBackground && !appBackground.includes("url(")) {
        expect(appBackgroundMobile).toBe(appBackground);
      } else if (appBackground && appBackgroundMobile) {
        const stem = (background: string) =>
          urlOf(background).replace(/(-mobile)?\.(jpe?g|webp)$/, "");
        expect(stem(appBackgroundMobile)).toBe(stem(appBackground));
      }
    },
  );
});
