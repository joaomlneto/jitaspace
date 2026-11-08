import type { AppTheme } from "~/lib/preferences";

/**
 * The season the Default theme is dressed for (`themes.default`), and when it
 * runs. Outside `[startsAt, endsAt)` Default shows `fallback` instead, so a
 * season can ship before its release and never outlives its event even if
 * nobody ships the next one in time. `endsAt: null` runs it until replaced.
 *
 * Decided in the browser, never on the server: pages are prerendered and
 * cached, so a server-side check would freeze whichever theme the page was
 * built with. The pre-paint script (`lib/themePreload.ts`) and
 * `AppMantineProvider` both read the visitor's clock before the first paint.
 *
 * Deliberately not a "use client" module, like `wallpapers.ts`: the pre-paint
 * script reads it on the server.
 */
export const DEFAULT_THEME_SEASON = {
  name: "Fractured Skies",
  // The expansion releases at downtime (11:00 UTC) on Tuesday 10 November
  // 2026. An expansion, not an event: it runs until the next season.
  startsAt: "2026-11-10T11:00:00Z",
  endsAt: null,
  fallback: "eve",
} as const satisfies {
  name: string;
  startsAt: string;
  endsAt: string | null;
  fallback: Exclude<AppTheme, "default">;
};

const parse = (value: string | null) =>
  value === null ? null : Date.parse(value);

/** Epoch milliseconds at which the season starts. */
export const DEFAULT_THEME_SEASON_START: number = Date.parse(
  DEFAULT_THEME_SEASON.startsAt,
);

/** Epoch milliseconds at which the season ends, or null if it does not. */
export const DEFAULT_THEME_SEASON_END: number | null = parse(
  DEFAULT_THEME_SEASON.endsAt,
);

/** Whether the Default theme shows its season at `now` (epoch ms). */
export const isDefaultThemeInSeason = (now: number) =>
  now >= DEFAULT_THEME_SEASON_START &&
  (DEFAULT_THEME_SEASON_END === null || now < DEFAULT_THEME_SEASON_END);

/**
 * The next time after `now` at which the Default theme switches between its
 * season and its fallback, or null if it never does again.
 */
export const nextDefaultThemeSeasonChange = (now: number) => {
  if (now < DEFAULT_THEME_SEASON_START) return DEFAULT_THEME_SEASON_START;
  if (DEFAULT_THEME_SEASON_END !== null && now < DEFAULT_THEME_SEASON_END) {
    return DEFAULT_THEME_SEASON_END;
  }
  return null;
};
