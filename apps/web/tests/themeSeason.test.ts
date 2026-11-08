import { describe, expect, it } from "@jest/globals";

import {
  DEFAULT_THEME_SEASON,
  DEFAULT_THEME_SEASON_END,
  DEFAULT_THEME_SEASON_START,
  isDefaultThemeInSeason,
  nextDefaultThemeSeasonChange,
} from "~/themes/season";

describe("Default theme season", () => {
  it("starts at downtime on Fractured Skies' release day", () => {
    expect(DEFAULT_THEME_SEASON.name).toBe("Fractured Skies");
    expect(new Date(DEFAULT_THEME_SEASON_START).toISOString()).toBe(
      "2026-11-10T11:00:00.000Z",
    );
    expect(DEFAULT_THEME_SEASON_END).toBeNull();
  });

  it.each([
    [DEFAULT_THEME_SEASON_START - 1, false],
    [DEFAULT_THEME_SEASON_START, true],
    [DEFAULT_THEME_SEASON_START + 365 * 24 * 60 * 60 * 1000, true],
  ])("is in season at %d: %s", (now, inSeason) => {
    expect(isDefaultThemeInSeason(now)).toBe(inSeason);
  });

  it("switches next at the start, then never again", () => {
    expect(nextDefaultThemeSeasonChange(0)).toBe(DEFAULT_THEME_SEASON_START);
    expect(nextDefaultThemeSeasonChange(DEFAULT_THEME_SEASON_START - 1)).toBe(
      DEFAULT_THEME_SEASON_START,
    );
    expect(nextDefaultThemeSeasonChange(DEFAULT_THEME_SEASON_START)).toBeNull();
  });
});
