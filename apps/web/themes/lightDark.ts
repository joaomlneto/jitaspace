/**
 * A colour for each colour scheme, as CSS `light-dark()`. It follows the
 * `color-scheme` Mantine sets on <html> from the user's light/dark choice, so
 * it works where Mantine's own scheme switching cannot reach: inline styles
 * (which is what theme `styles` become), `bg`/`c` props, and the wallpaper and
 * pre-paint values outside React.
 *
 * Only for colours: `light-dark()` is not valid for a whole `background-image`,
 * so a gradient takes one per colour stop.
 *
 * Deliberately not a "use client" module, like `wallpapers.ts`: the pre-paint
 * theme script reads values built with it on the server.
 */
export const lightDark = (light: string, dark: string) =>
  `light-dark(${light}, ${dark})`;
