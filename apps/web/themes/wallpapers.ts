/**
 * Themed wallpapers, as `theme.other.appBackground` / `appBackgroundMobile`
 * (CSS `background` values).
 *
 * Each wallpaper ships twice: the full 3840x2160 JPEG, and a `-mobile.webp` that
 * is a centred 9:16 crop at 1080x1920 (~50-100 KB against ~500 KB). On a phone
 * `cover` only ever shows the middle sliver of the 16:9 original, so the crop
 * shows exactly what the original did, sharper and a fraction of the download.
 * MainLayout.module.css picks between them with a media query.
 *
 * Deliberately not a "use client" module: besides the Mantine themes, the
 * pre-paint theme script (`lib/themePreload.ts`) reads these on the server, and
 * a server import of a "use client" module yields references, not values.
 */
import { lightDark } from "./lightDark";

const DIRECTORY = "/wallpapers/2026-cradle-of-war";

// The veil over the art: 55% black on the dark scheme, and a pale wash on the
// light one so light panels and dark text stand out from it.
const veil = lightDark("rgba(242,247,251,0.86)", "rgba(0,0,0,0.55)");

const layer = (url: string) =>
  `linear-gradient(${veil},${veil}),url(${url}) center/cover no-repeat`;

const wallpaper = (file: string, extension: "jpg" | "jpeg") => ({
  appBackground: layer(`${DIRECTORY}/${file}.${extension}`),
  appBackgroundMobile: layer(`${DIRECTORY}/${file}-mobile.webp`),
});

export const WALLPAPERS = {
  cradleOfWar: wallpaper("cradle-of-war-nologo-compressed", "jpeg"),
  amarr: wallpaper("amarr_wallpaper", "jpg"),
  caldari: wallpaper("caldari_wallpaper", "jpg"),
  gallente: wallpaper("gallente_wallpaper", "jpg"),
  minmatar: wallpaper("minmatar_wallpaper", "jpg"),
} as const;
