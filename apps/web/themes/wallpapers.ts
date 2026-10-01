/**
 * Themed wallpapers (`theme.other.appBackground`), as CSS `background` values.
 *
 * Deliberately not a "use client" module: besides the Mantine themes, the
 * pre-paint theme script (`lib/themePreload.ts`) reads these on the server, and
 * a server import of a "use client" module yields references, not values.
 */
const wallpaper = (file: string) =>
  `linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)),url(/wallpapers/2026-cradle-of-war/${file}) center/cover no-repeat`;

export const WALLPAPERS = {
  cradleOfWar: wallpaper("cradle-of-war-nologo-compressed.jpeg"),
  amarr: wallpaper("amarr_wallpaper.jpg"),
  caldari: wallpaper("caldari_wallpaper.jpg"),
  gallente: wallpaper("gallente_wallpaper.jpg"),
  minmatar: wallpaper("minmatar_wallpaper.jpg"),
} as const;
