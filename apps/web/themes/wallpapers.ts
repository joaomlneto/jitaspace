/**
 * Themed wallpapers, as `theme.other.appBackground` / `appBackgroundMobile`
 * (CSS `background` values).
 *
 * Each wallpaper ships twice: the full 16:9 image (a 3840x2160 JPEG where we
 * have one), and a `-mobile.webp` that is a centred 9:16 crop of it, at
 * 1080x1920 or the source's own height if smaller (~50-100 KB against
 * ~400-500 KB). On a phone `cover` only ever shows the middle sliver of the
 * 16:9 original, so the crop shows exactly what the original did, sharper and
 * a fraction of the download.
 * MainLayout.module.css picks between them with a media query.
 *
 * Deliberately not a "use client" module: besides the Mantine themes, the
 * pre-paint theme script (`lib/themePreload.ts`) reads these on the server, and
 * a server import of a "use client" module yields references, not values.
 */
import { lightDark } from "./lightDark";

// The veil over the art: 55% black on the dark scheme, and a pale wash on the
// light one so light panels and dark text stand out from it.
const veil = lightDark("rgba(242,247,251,0.86)", "rgba(0,0,0,0.55)");

const layer = (url: string) =>
  `linear-gradient(${veil},${veil}),url(${url}) center/cover no-repeat`;

const wallpaper = (
  directory: string,
  file: string,
  extension: "jpg" | "jpeg" | "webp",
) => ({
  appBackground: layer(`/wallpapers/${directory}/${file}.${extension}`),
  appBackgroundMobile: layer(`/wallpapers/${directory}/${file}-mobile.webp`),
});

const CRADLE_OF_WAR = "2026-cradle-of-war";

export const WALLPAPERS = {
  cradleOfWar: wallpaper(
    CRADLE_OF_WAR,
    "cradle-of-war-nologo-compressed",
    "jpeg",
  ),
  amarr: wallpaper(CRADLE_OF_WAR, "amarr_wallpaper", "jpg"),
  caldari: wallpaper(CRADLE_OF_WAR, "caldari_wallpaper", "jpg"),
  gallente: wallpaper(CRADLE_OF_WAR, "gallente_wallpaper", "jpg"),
  minmatar: wallpaper(CRADLE_OF_WAR, "minmatar_wallpaper", "jpg"),
  // The 2026 Crimson Harvest event key art, without its logo.
  crimsonHarvest: wallpaper(
    "2026-crimson-harvest",
    "crimson-harvest-nologo",
    "webp",
  ),
} as const;
