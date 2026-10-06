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

/**
 * The EVE themes' panel (Paper and Card) surface: a dark glass panel on the
 * dark scheme, as designed, and its pale counterpart on the light one.
 */
export const evePanelSurface = {
  bg: lightDark("#f4f8fb", "#070b11"),
  backgroundColor: lightDark(
    "rgba(244, 248, 251, 0.92)",
    "rgba(8, 11, 17, 0.88)",
  ),
  backgroundImage: `linear-gradient(180deg, ${lightDark(
    "rgba(250, 252, 254, 0.94)",
    "rgba(26, 33, 45, 0.9)",
  )} 0%, ${lightDark("rgba(241, 246, 250, 0.95)", "rgba(13, 18, 28, 0.93)")} 58%, ${lightDark(
    "rgba(233, 240, 246, 0.97)",
    "rgba(8, 11, 18, 0.96)",
  )} 100%)`,
  borderColor: lightDark(
    "rgba(67, 100, 127, 0.3)",
    "rgba(108, 132, 151, 0.28)",
  ),
  borderTopColor: lightDark(
    "rgba(53, 148, 157, 0.55)",
    "rgba(147, 214, 224, 0.46)",
  ),
  boxShadow: `inset 0 1px 0 ${lightDark(
    "rgba(255, 255, 255, 0.8)",
    "rgba(182, 210, 230, 0.12)",
  )}, inset 0 -10px 18px ${lightDark(
    "rgba(67, 100, 127, 0.06)",
    "rgba(2, 8, 16, 0.35)",
  )}, 0 10px 22px ${lightDark("rgba(28, 49, 61, 0.12)", "rgba(0, 0, 0, 0.36)")}`,
} as const;
