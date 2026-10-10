import type { AppTheme } from "~/lib/preferences";

/**
 * The season the Default theme is dressed for (`themes.default`), and when it
 * ends. From `endsAt` on, Default shows `fallback` instead, so an event theme
 * never outlives its event even if nobody ships the next season in time.
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
  name: "Crimson Harvest",
  // The event ends at downtime (11:00 UTC) on 3 November 2026.
  endsAt: "2026-11-03T11:00:00Z",
  fallback: "eve",
} as const satisfies {
  name: string;
  endsAt: string;
  fallback: Exclude<AppTheme, "default">;
};

/** Epoch milliseconds at which the season ends. */
export const DEFAULT_THEME_SEASON_END = Date.parse(DEFAULT_THEME_SEASON.endsAt);

/** Whether the Default theme's season is over at `now` (epoch ms). */
export const isDefaultThemeSeasonOver = (now: number) =>
  now >= DEFAULT_THEME_SEASON_END;
