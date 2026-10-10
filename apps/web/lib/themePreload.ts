import type { AppTheme, DEFAULT_APP_THEME } from "~/lib/preferences";
import { PREFERENCES_STORAGE_KEY } from "~/lib/preferences";
import { lightDark } from "~/themes/lightDark";
import { WALLPAPERS } from "~/themes/wallpapers";

/**
 * Pre-paint theme: stops the default theme from flashing on load for anyone who
 * picked another one.
 *
 * The theme preference lives in localStorage, which the server cannot see, and
 * the pages are prerendered, so the HTML always arrives styled with the default
 * theme; the real one only applies once React hydrates. Mantine themes are
 * JavaScript (component defaultProps and styles, not just CSS variables), so
 * they cannot be applied before that.
 *
 * Instead, an inline <head> script ({@link THEME_PRELOAD_SCRIPT}) runs before
 * the first paint and, for a non-default theme, marks <html> as pending: the
 * page shows that theme's background and wallpaper (globals.css) with the app
 * shell hidden. AppMantineProvider applies the theme in a layout effect and
 * then calls {@link revealPrePaintTheme}, all before the browser paints the
 * hydrated page, so the default theme is never on screen. If JavaScript never
 * gets that far, a CSS animation reveals the shell after 4s regardless.
 */

export const THEME_PENDING_ATTRIBUTE = "data-app-theme-pending";

interface ThemePreload {
  /**
   * The theme's `--mantine-color-body`: `white` on the light scheme and
   * `colors.dark[7]` on the dark one, as `light-dark()`.
   */
  body: string;
  /** The theme's `other.appBackground`, if it has one. */
  background?: string;
  /** Its `other.appBackgroundMobile`, for portrait phones. */
  backgroundMobile?: string;
}

const preload = (
  body: string,
  wallpaper: { appBackground: string; appBackgroundMobile: string },
): ThemePreload => ({
  body: lightDark("#f2f7fb", body),
  background: wallpaper.appBackground,
  backgroundMobile: wallpaper.appBackgroundMobile,
});

/**
 * What each selectable non-default theme looks like before hydration. Kept in
 * step with the Mantine themes by `tests/themePreload.test.ts`, since this
 * module cannot import them (they are "use client").
 */
export const THEME_PRELOAD: Record<
  Exclude<AppTheme, typeof DEFAULT_APP_THEME>,
  ThemePreload
> = {
  // No wallpaper: just Mantine's own body colours.
  minimal: { body: lightDark("#fff", "#242424") },
  eve: preload("#111111", WALLPAPERS.cradleOfWar),
  amarr: preload("#111111", WALLPAPERS.amarr),
  caldari: preload("#111111", WALLPAPERS.caldari),
  gallente: preload("#111111", WALLPAPERS.gallente),
  minmatar: preload("#111111", WALLPAPERS.minmatar),
  ore: preload("#111111", WALLPAPERS.cradleOfWar),
  sisters_of_eve: preload("#111111", WALLPAPERS.cradleOfWar),
  carbon: preload("#111111", WALLPAPERS.cradleOfWar),
  photon: preload("#111111", WALLPAPERS.cradleOfWar),
  whpd: {
    body: lightDark("#eef2ff", "#080c18"),
    background: lightDark("#eef2ff", "#000"),
    backgroundMobile: lightDark("#eef2ff", "#000"),
  },
};

/** JSON for embedding in a <script>: `<` escaped so no value can close the tag. */
const json = (value: unknown) =>
  JSON.stringify(value).replaceAll("<", "\\u003c");

// Mirrors the persist middleware's storage format ({ state: { appTheme } })
// and sanitizeAppTheme's normalisation. Anything unexpected leaves the page
// untouched, i.e. exactly as it behaved before this script existed.
const script = (key: string, themes: Record<string, ThemePreload>) => `(() => {
  try {
    const raw = localStorage.getItem(${json(key)});
    if (!raw) return;
    let theme = JSON.parse(raw)?.state?.appTheme;
    if (typeof theme !== "string") return;
    theme = theme.trim().toLowerCase();
    const themes = ${json(themes)};
    if (!Object.prototype.hasOwnProperty.call(themes, theme)) return;
    const html = document.documentElement;
    html.setAttribute(${json(THEME_PENDING_ATTRIBUTE)}, theme);
    html.style.setProperty("--app-pending-body", themes[theme].body);
    if (themes[theme].background) {
      html.style.setProperty("--app-pending-background", themes[theme].background);
    }
    if (themes[theme].backgroundMobile) {
      html.style.setProperty("--app-pending-background-mobile", themes[theme].backgroundMobile);
    }
  } catch {}
})();`;

/** The inline script for <head>. */
export const THEME_PRELOAD_SCRIPT = script(
  PREFERENCES_STORAGE_KEY,
  THEME_PRELOAD,
);

/** Undoes the pre-paint script once the real theme has been rendered. */
export function revealPrePaintTheme() {
  const html = document.documentElement;
  html.removeAttribute(THEME_PENDING_ATTRIBUTE);
  html.style.removeProperty("--app-pending-body");
  html.style.removeProperty("--app-pending-background");
  html.style.removeProperty("--app-pending-background-mobile");
}
